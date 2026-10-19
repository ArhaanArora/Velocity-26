import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceStability, explain, resourcePressure, STABLE_TARGET, systemStatus } from './learning.ts';
import { simulationEngine } from '../adapters/engineAdapter.ts';
import { normalTrafficPreset, midnightOutagePreset } from './presets.ts';

test('challenge counts consecutive ticks at the target and resets below it', () => {
  let stable = 0;
  for (let i = 0; i < 14; i++) stable = advanceStability(stable, 85);
  assert.equal(stable, 14);
  assert.equal(advanceStability(stable, 84.99), 0);
  stable = advanceStability(stable, 85);
  assert.equal(stable, STABLE_TARGET);
  assert.equal(advanceStability(stable, 100), STABLE_TARGET);
});

test('availability status distinguishes degraded service from challenge success', () => {
  const metrics = simulationEngine.createInitialState(normalTrafficPreset).metrics;
  assert.equal(systemStatus({ ...metrics, legitAvailabilityPercent: 85, status: 'degraded' }).tone, 'warning');
  assert.equal(systemStatus({ ...metrics, legitAvailabilityPercent: 100, status: 'down' }).tone, 'danger');
  assert.equal(systemStatus(metrics).tone, 'healthy');
  assert.equal(resourcePressure({ ...metrics, cpuPercent: 95 }), true);
});

test('tutor uses current evidence and states unsupported-topic limitations', () => {
  const initial = simulationEngine.createInitialState(midnightOutagePreset);
  const metrics = simulationEngine.stepSimulation(midnightOutagePreset, initial).metrics;
  const answer = explain('Why is my server struggling?', midnightOutagePreset, metrics);
  assert.match(answer, new RegExp(`${metrics.incoming} requests/s`));
  assert.match(explain('What are connection slots?', midnightOutagePreset, metrics), /half-open SYN connections/);
  assert.match(explain('What are connection slots?', midnightOutagePreset, metrics), /does not throttle processing/);
  assert.match(explain('Tell me a joke', midnightOutagePreset, metrics), /not a general AI chatbot/);
  assert.notEqual(explain('Give me a hint', midnightOutagePreset, metrics, true, 0), explain('Give me a hint', midnightOutagePreset, metrics, true, 1));
});

test('tutor applies the engine’s integer-rounded legitimate filtering and server scaling', () => {
  const config = { ...midnightOutagePreset, filterStrength: 0.9, loadBalancer: true, serverCount: 3 };
  const metrics = simulationEngine.stepSimulation(config, simulationEngine.createInitialState(config)).metrics;
  assert.match(explain('Why are legitimate users being blocked?', config, metrics), /5 of 50 legitimate/);
  assert.match(explain('Why is the queue full?', config, metrics), /of 1500 configured requests/);
});
