import test from 'node:test';
import assert from 'node:assert/strict';
import { simulationEngine, normalTrafficPreset, midnightOutagePreset } from '../adapters/engineAdapter';
import { customerInsight, describeChange, measureChange, sameConfig, storeCondition } from './experience';
import type { SimulationConfig } from '../shared/simulationTypes';

function run(config: SimulationConfig, ticks = 1) {
  let state = simulationEngine.createInitialState(config);
  for (let i = 0; i < ticks; i++) state = simulationEngine.stepSimulation(config, state);
  return state;
}

test('Nova Store follows engine status, availability, and latency deterministically', () => {
  const healthy = run(normalTrafficPreset).metrics;
  assert.equal(storeCondition(healthy), 'healthy');
  assert.equal(storeCondition(run(midnightOutagePreset).metrics), 'unavailable');
  assert.equal(storeCondition({ ...healthy, status: 'degraded' }), 'degraded');
  assert.equal(storeCondition({ ...healthy, latencyMs: 300 }), 'degraded');
  assert.equal(storeCondition({ ...healthy, status: 'down' }), 'unavailable');
  assert.equal(storeCondition({ ...healthy, legitAvailabilityPercent: 49 }), 'unavailable');
});

test('effects cannot be measured before simulation time advances', () => {
  const state = run(normalTrafficPreset);
  const baseline = { metrics: state.metrics, config: normalTrafficPreset, tick: state.tick };
  assert.throws(() => measureChange(baseline, state.metrics, normalTrafficPreset, state.tick), /only after simulation time advances/);
});

test('first measurement does not claim a fabricated before-and-after improvement', () => {
  const initial = simulationEngine.createInitialState(normalTrafficPreset);
  const config = { ...normalTrafficPreset, filterStrength: 1 };
  const after = simulationEngine.stepSimulation(config, initial);
  const outcome = measureChange({ metrics: initial.metrics, config: normalTrafficPreset, tick: 0 }, after.metrics, config, after.tick);
  assert.equal(outcome.kind, 'initial');
  assert.equal(outcome.availabilityDelta, null);
  assert.match(outcome.explanation, /first measured tick/);
});

test('recovery feedback copies the actual two engine snapshots without mutating them', () => {
  const before = run(midnightOutagePreset, 5);
  const baseline = { metrics: Object.freeze({ ...before.metrics }), config: Object.freeze({ ...midnightOutagePreset }), tick: before.tick };
  const config = { ...midnightOutagePreset, filterStrength: 0.9, loadBalancer: true, serverCount: 3 };
  const after = simulationEngine.stepSimulation(config, before);
  const saved = structuredClone(baseline);
  const result = measureChange(baseline, after.metrics, config, after.tick);
  assert.equal(result.kind, 'improved');
  assert.deepEqual(result.before, before.metrics);
  assert.deepEqual(result.after, after.metrics);
  assert.notEqual(result.before, baseline.metrics);
  assert.equal(result.availabilityDelta, after.metrics.legitAvailabilityPercent - before.metrics.legitAvailabilityPercent);
  assert.deepEqual(baseline, saved);
});

test('filtering can worsen service and feedback reports the loss honestly', () => {
  const before = run(normalTrafficPreset);
  const config = { ...normalTrafficPreset, filterStrength: 1 };
  const after = simulationEngine.stepSimulation(config, before);
  const result = measureChange({ metrics: before.metrics, config: normalTrafficPreset, tick: before.tick }, after.metrics, config, after.tick);
  assert.equal(result.kind, 'worse');
  assert.equal(result.availabilityDelta, -10);
  assert.match(result.explanation, /rejects some legitimate requests/);
});

test('adding idle servers makes no availability claim and explains the missing balancer', () => {
  const before = run(normalTrafficPreset);
  const config = { ...normalTrafficPreset, serverCount: 3 };
  const after = simulationEngine.stepSimulation(config, before);
  const result = measureChange({ metrics: before.metrics, config: normalTrafficPreset, tick: before.tick }, after.metrics, config, after.tick);
  assert.equal(result.kind, 'steady');
  assert.equal(result.availabilityDelta, 0);
  assert.match(result.explanation, /Extra servers are waiting/);
  assert.equal(describeChange(normalTrafficPreset, config), 'Server added');
  assert.equal(sameConfig(normalTrafficPreset, { ...normalTrafficPreset }), true);
  assert.equal(sameConfig(normalTrafficPreset, config), false);
});

test('customer-facing warnings are grounded in actual pressure', () => {
  const baseline = run(normalTrafficPreset).metrics;
  assert.match(customerInsight({ ...baseline, connectionPercent: 100 }), /Connection slots/);
  assert.match(customerInsight({ ...baseline, cpuPercent: 100 }), /processing limit/);
  assert.match(customerInsight({ ...baseline, latencyMs: 500 }), /Requests are waiting/);
  assert.match(customerInsight(run(midnightOutagePreset).metrics), /Most customers cannot reach/);
});
