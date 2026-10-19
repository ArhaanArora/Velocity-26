import type {
  SimulationConfig,
  SimulationEngine,
  SimulationMetrics,
  SimulationState,
} from '../shared/simulationTypes';

// Temporary educational model for the checked-in, reduced shared contract.
// Bandwidth and connections are normalized estimates, not physical capacities.
// The contract stores only total queue depth; backlog is split by current demand.
// This mock deliberately does not implement the richer MODEL.md engine contract.
const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

function calculate(config: SimulationConfig, previousQueue: number): SimulationMetrics {
  const normal = Math.max(0, Math.round(finite(config.normalRps)));
  const surge = Math.max(0, Math.round(finite(config.surgeRps)));
  const servers = config.balancerEnabled ? Math.max(1, Math.floor(finite(config.serverCount, 1))) : 1;
  const capacity = Math.max(1, Math.round(finite(config.serverCapacityRps, 1))) * servers;
  const queueCapacity = Math.max(0, Math.round(finite(config.queueCapacity)));
  const strength = config.rateLimitEnabled ? clamp(finite(config.filterStrength), 0, 1) : 0;
  const blockedNormal = Math.round(normal * strength * 0.1);
  const blockedSurge = Math.round(surge * strength);
  const passedNormal = normal - blockedNormal;
  const passedSurge = surge - blockedSurge;
  const passed = passedNormal + passedSurge;
  const backlog = Math.max(0, Math.round(finite(previousQueue)));
  const normalWeight = passed === 0 ? 1 : passedNormal / passed;
  const availableNormal = passedNormal + Math.round(backlog * normalWeight);
  const availableSurge = passedSurge + backlog - Math.round(backlog * normalWeight);
  const available = availableNormal + availableSurge;
  const served = Math.min(capacity, available);
  const servedNormal = available === 0 ? 0 : clamp(Math.round(served * availableNormal / available), Math.max(0, served - availableSurge), Math.min(availableNormal, served));
  const servedSurge = served - servedNormal;
  const remainingNormal = availableNormal - servedNormal;
  const remainingSurge = availableSurge - servedSurge;
  const remaining = remainingNormal + remainingSurge;
  const queueDepth = Math.min(queueCapacity, remaining);
  const queuedNormal = remaining === 0 ? 0 : clamp(Math.round(queueDepth * remainingNormal / remaining), Math.max(0, queueDepth - remainingSurge), Math.min(remainingNormal, queueDepth));

  return {
    incoming: normal + surge,
    blocked: blockedNormal + blockedSurge,
    servedNormal,
    servedSurge,
    droppedNormal: remainingNormal - queuedNormal,
    droppedSurge: remainingSurge - (queueDepth - queuedNormal),
    queueDepth,
    cpuPct: served / capacity * 100,
    bandwidthPct: Math.min(100, passed / (capacity * 1.5) * 100),
    connectionPct: Math.min(100, (served + queueDepth) / (capacity + queueCapacity) * 100),
    queuePct: queueCapacity === 0 ? 0 : queueDepth / queueCapacity * 100,
    latencyMs: 50 + Math.round(queueDepth / capacity * 1000),
    availabilityPct: normal === 0 ? 100 : Math.min(100, servedNormal / normal * 100),
  };
}

export function createInitialState(config: SimulationConfig): SimulationState {
  // Tick zero is a preview with an empty backlog. Time starts on the first step.
  const metrics = calculate(config, 0);
  return { tick: 0, metrics, history: [{ tick: 0, ...metrics }] };
}

export function stepSimulation(config: SimulationConfig, state: SimulationState): SimulationState {
  const metrics = calculate(config, state.metrics.queueDepth);
  const tick = state.tick + 1;
  return { tick, metrics, history: [...state.history, { tick, ...metrics }].slice(-60) };
}

export const simulationEngine: SimulationEngine = { createInitialState, stepSimulation };
