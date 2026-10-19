import test from 'node:test';
import assert from 'node:assert/strict';
import { simulationEngine } from './mockEngine.ts';
import { normalTrafficPreset, trafficSurgePreset, midnightOutagePreset } from '../lib/presets.ts';

function run(config, ticks = 1) {
  let state = simulationEngine.createInitialState(config);
  for (let index = 0; index < ticks; index++) state = simulationEngine.stepSimulation(config, state);
  return state;
}

test('initial normal traffic is healthy at tick zero', () => {
  const state = simulationEngine.createInitialState(normalTrafficPreset);
  assert.equal(state.tick, 0);
  assert.equal(state.metrics.availabilityPct, 100);
  assert.equal(state.metrics.queueDepth, 0);
  assert.equal(state.metrics.servedNormal, 120);
});

test('steps are deterministic, immutable, and keep the latest 60 snapshots', () => {
  const config = Object.freeze({ ...trafficSurgePreset });
  let previous = simulationEngine.createInitialState(config);
  for (let i = 0; i < 80; i++) {
    const saved = structuredClone(previous);
    Object.freeze(previous.metrics);
    Object.freeze(previous.history);
    Object.freeze(previous);
    const next = simulationEngine.stepSimulation(config, previous);
    assert.deepEqual(previous, saved);
    assert.deepEqual(next, simulationEngine.stepSimulation(config, previous));
    assert.equal(next.tick, previous.tick + 1);
    assert.notEqual(next.history, previous.history);
    previous = next;
  }
  assert.equal(previous.history.length, 60);
  assert.equal(previous.history[0].tick, 21);
  assert.equal(previous.history.at(-1).tick, 80);
});

test('every tick conserves total requests including queue changes', () => {
  for (const config of [normalTrafficPreset, trafficSurgePreset, midnightOutagePreset, { ...trafficSurgePreset, rateLimitEnabled: true }, { ...normalTrafficPreset, queueCapacity: 0, surgeRps: 1000 }]) {
    let state = simulationEngine.createInitialState(config);
    for (let i = 0; i < 20; i++) {
      const previousQueue = state.metrics.queueDepth;
      state = simulationEngine.stepSimulation(config, state);
      const m = state.metrics;
      assert.equal(m.incoming, m.blocked + m.servedNormal + m.servedSurge + m.droppedNormal + m.droppedSurge + m.queueDepth - previousQueue);
      for (const key of ['cpuPct', 'bandwidthPct', 'connectionPct', 'queuePct', 'availabilityPct']) assert.ok(m[key] >= 0 && m[key] <= 100, `${key}: ${m[key]}`);
      for (const value of Object.values(m)) assert.ok(Number.isFinite(value) && value >= 0);
    }
  }
});

test('filtering reduces pressure and creates legitimate-user false positives', () => {
  const baseline = run(midnightOutagePreset, 5);
  const filtered = run({ ...midnightOutagePreset, rateLimitEnabled: true, filterStrength: 0.9 }, 5);
  assert.ok(filtered.metrics.blocked > 0);
  assert.ok(filtered.metrics.availabilityPct > baseline.metrics.availabilityPct);
  const quiet = run({ ...normalTrafficPreset, rateLimitEnabled: true, filterStrength: 1 });
  assert.equal(quiet.metrics.servedNormal, 108);
  assert.equal(quiet.metrics.availabilityPct, 90);
});

test('additional servers only add capacity when balancing is enabled', () => {
  const baseline = run(trafficSurgePreset, 5);
  const idleServers = run({ ...trafficSurgePreset, serverCount: 4 }, 5);
  const balanced = run({ ...trafficSurgePreset, serverCount: 4, balancerEnabled: true }, 5);
  assert.deepEqual(baseline.metrics, idleServers.metrics);
  assert.ok(balanced.metrics.servedNormal > baseline.metrics.servedNormal);
  assert.equal(balanced.metrics.availabilityPct, 100);
});

test('zero traffic drains the queue and configuration bounds stay finite', () => {
  const state = simulationEngine.createInitialState(trafficSurgePreset);
  const drained = simulationEngine.stepSimulation({ ...normalTrafficPreset, normalRps: 0, surgeRps: 0 }, state);
  assert.equal(drained.metrics.queueDepth, 0);
  assert.equal(drained.metrics.availabilityPct, 100);
  const invalid = run({ ...normalTrafficPreset, normalRps: -5, surgeRps: NaN, queueCapacity: -20, serverCapacityRps: 0, serverCount: -2, filterStrength: Infinity });
  for (const value of Object.values(invalid.metrics)) assert.ok(Number.isFinite(value) && value >= 0);
});
