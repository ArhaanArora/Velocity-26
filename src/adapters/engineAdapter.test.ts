import test from 'node:test';
import assert from 'node:assert/strict';
import { simulationEngine, normalTrafficPreset, trafficSurgePreset, midnightOutagePreset } from './engineAdapter';
import { simulationEngine as realEngine, normalTrafficPreset as realNormal, midnightOutagePreset as realIncident } from '../engine';
import { advanceStability, resourcePressure } from '../lib/learning';
import type { SimulationConfig } from '../shared/simulationTypes';

function run(config: SimulationConfig, ticks = 1) {
  let state = simulationEngine.createInitialState(config);
  for (let i = 0; i < ticks; i++) state = simulationEngine.stepSimulation(config, state);
  return state;
}

test('adapter exports the real engine and exact engine presets without a mock fallback', () => {
  assert.equal(simulationEngine, realEngine);
  assert.equal(normalTrafficPreset, realNormal);
  assert.equal(midnightOutagePreset, realIncident);
  assert.equal(run(normalTrafficPreset).metrics.legitServed, 50);
});

test('normal operation, volume overload, and None mode produce real engine metrics', () => {
  assert.equal(run(normalTrafficPreset).metrics.status, 'normal');
  const overloaded = run(trafficSurgePreset, 5);
  assert.equal(overloaded.metrics.cpuPercent, 100);
  assert.ok(overloaded.metrics.legitAvailabilityPercent < 50);
  assert.ok(overloaded.metrics.attackDropped > 0);
  assert.equal(run({ ...trafficSurgePreset, attackType: 'none' }).metrics.incoming, normalTrafficPreset.legitRate);
});

test('SYN exhaustion fills connection slots and constrains queue room without fake CPU work', () => {
  const config = { ...trafficSurgePreset, attackType: 'syn' as const, legitRate: 600 };
  const state = run(config, 4);
  assert.equal(state.halfOpen, config.perServerConnections);
  assert.equal(state.metrics.connectionPercent, 100);
  assert.equal(state.metrics.attackServed, 0);
  assert.equal(state.metrics.attackDropped, config.attackRate);
  assert.equal(state.metrics.queueDepth, 0);
  assert.ok(state.metrics.legitDropped > 0);
  assert.ok(resourcePressure(state.metrics));
});

test('moderate and aggressive filtering reduce demand while blocking legitimate requests', () => {
  const overloaded = run(midnightOutagePreset, 5);
  const moderate = run({ ...midnightOutagePreset, filterStrength: 0.5 }, 5);
  const aggressive = run({ ...midnightOutagePreset, filterStrength: 1 }, 5);
  assert.ok(moderate.metrics.blocked > 0);
  assert.ok(moderate.metrics.legitAvailabilityPercent > overloaded.metrics.legitAvailabilityPercent);
  assert.ok(aggressive.metrics.blocked > moderate.metrics.blocked);
  const collateral = run({ ...normalTrafficPreset, filterStrength: 1 });
  assert.equal(collateral.metrics.legitServed, 45);
  assert.equal(collateral.metrics.legitAvailabilityPercent, 90);
});

test('extra servers stay idle without balancing and scale resources with balancing', () => {
  assert.deepEqual(run({ ...trafficSurgePreset, serverCount: 3 }, 5), run(trafficSurgePreset, 5));
  const balanced = run({ ...trafficSurgePreset, serverCount: 3, loadBalancer: true }, 5);
  assert.equal(balanced.metrics.legitAvailabilityPercent, 100);
  assert.equal(balanced.metrics.queueDepth, 0);
});

test('bandwidth, connection, queue, and processing settings reach the real engine', () => {
  const baseline = run(trafficSurgePreset);
  assert.ok(run({ ...trafficSurgePreset, perServerBandwidth: 2000 }).metrics.bandwidthPercent < baseline.metrics.bandwidthPercent);
  assert.ok(run({ ...trafficSurgePreset, perServerConnections: 600 }).metrics.queueDepth > baseline.metrics.queueDepth);
  assert.equal(run({ ...trafficSurgePreset, perServerQueue: 0 }).metrics.queueDepth, 0);
  assert.ok(run({ ...trafficSurgePreset, perServerCapacity: 600 }).metrics.legitServed > baseline.metrics.legitServed);
});

test('real-engine ticks stay immutable, finite, deterministic, conserved, and bounded to 60 snapshots', () => {
  for (const config of [normalTrafficPreset, trafficSurgePreset, { ...trafficSurgePreset, attackType: 'syn' as const }, { ...midnightOutagePreset, filterStrength: 0.9, loadBalancer: true, serverCount: 3 }]) {
    let state = simulationEngine.createInitialState(config);
    for (let i = 0; i < 75; i++) {
      const previous = structuredClone(state);
      Object.freeze(state.metrics); Object.freeze(state.history); Object.freeze(state);
      const next = simulationEngine.stepSimulation(config, state);
      assert.deepEqual(state, previous);
      assert.deepEqual(next, simulationEngine.stepSimulation(config, state));
      const m = next.metrics;
      assert.equal(m.incoming, m.blocked + m.legitServed + m.attackServed + m.legitDropped + m.attackDropped + next.queueLegit + next.queueAttack - state.queueLegit - state.queueAttack);
      for (const value of Object.values(m).filter(value => typeof value === 'number')) assert.ok(Number.isFinite(value) && value >= 0);
      for (const key of ['cpuPercent', 'bandwidthPercent', 'connectionPercent', 'queuePercent', 'legitAvailabilityPercent'] as const) assert.ok(m[key] <= 100);
      state = next;
    }
    assert.equal(state.history.length, 60);
    assert.equal(state.history[0].tick, 16);
    assert.equal(state.history[59].tick, 75);
  }
});

test('Midnight Outage recovers through the real engine for 15 consecutive successful ticks', () => {
  assert.ok(run(midnightOutagePreset, 5).metrics.legitAvailabilityPercent < 60);
  const defended = { ...midnightOutagePreset, filterStrength: 0.9, loadBalancer: true, serverCount: 3 };
  let state = run(midnightOutagePreset, 5);
  let stable = 0;
  for (let i = 0; i < 15; i++) {
    state = simulationEngine.stepSimulation(defended, state);
    stable = advanceStability(stable, state.metrics.legitAvailabilityPercent);
    assert.equal(stable, i + 1);
  }
  assert.equal(stable, 15);
  assert.equal(state.metrics.status, 'normal');
  state = simulationEngine.stepSimulation(midnightOutagePreset, state);
  assert.equal(advanceStability(stable, state.metrics.legitAvailabilityPercent), 0);
});
