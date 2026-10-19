import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceStability, explain, resourcePressure, STABLE_TARGET, systemStatus } from './learning.ts';
import { simulationEngine } from '../mocks/mockEngine.ts';
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
  assert.equal(systemStatus({ ...metrics, availabilityPct: 85 }).tone, 'warning');
  assert.equal(systemStatus({ ...metrics, availabilityPct: 49 }).tone, 'danger');
  assert.equal(systemStatus(metrics).tone, 'healthy');
  assert.equal(resourcePressure({ ...metrics, cpuPct: 95 }), true);
});

test('tutor uses current evidence and states unsupported-topic limitations', () => {
  const metrics = simulationEngine.createInitialState(midnightOutagePreset).metrics;
  const answer = explain('Why is my server struggling?', midnightOutagePreset, metrics);
  assert.match(answer, new RegExp(`${metrics.incoming} requests/s`));
  assert.match(explain('What are connection slots?', midnightOutagePreset, metrics), /normalized load estimates/);
  assert.match(explain('Tell me a joke', midnightOutagePreset, metrics), /not a general AI chatbot/);
  assert.notEqual(explain('Give me a hint', midnightOutagePreset, metrics, true, 0), explain('Give me a hint', midnightOutagePreset, metrics, true, 1));
});
