import type { SimulationConfig, SimulationEngine, SimulationMetrics, SimulationState } from '../shared/simulationTypes';

// Standalone development fallback for the current shared API. Never selected
// automatically; the production adapter always imports Agam's real engine.
const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const percent = (used: number, total: number) => total === 0 ? 0 : clamp(used / total * 100, 0, 100);
function split(total: number, normal: number, excess: number): [number, number] {
  const normalPart = normal + excess === 0 ? 0 : clamp(Math.round(total * normal / (normal + excess)), Math.max(0, total - excess), Math.min(normal, total));
  return [normalPart, total - normalPart];
}

export function createInitialState(_config: SimulationConfig): SimulationState {
  const metrics: SimulationMetrics = {
    incoming: 0, blocked: 0, legitServed: 0, attackServed: 0,
    legitDropped: 0, attackDropped: 0, queueDepth: 0,
    cpuPercent: 0, bandwidthPercent: 0, connectionPercent: 0, queuePercent: 0,
    latencyMs: 50, legitAvailabilityPercent: 100, status: 'normal',
  };
  return { tick: 0, queueLegit: 0, queueAttack: 0, halfOpen: 0, metrics, history: [] };
}

export function stepSimulation(config: SimulationConfig, state: SimulationState): SimulationState {
  const normal = Math.max(0, Math.round(finite(config.legitRate)));
  const excess = config.attackType === 'none' ? 0 : Math.max(0, Math.round(finite(config.attackRate)));
  const servers = config.loadBalancer ? Math.max(1, Math.floor(finite(config.serverCount, 1))) : 1;
  const capacity = Math.max(1, Math.round(finite(config.perServerCapacity, 1))) * servers;
  const bandwidth = Math.max(1, finite(config.perServerBandwidth, 1)) * servers;
  const connections = Math.max(1, finite(config.perServerConnections, 1)) * servers;
  const queueCapacity = Math.max(0, Math.round(finite(config.perServerQueue))) * servers;
  const strength = clamp(finite(config.filterStrength), 0, 1);
  const blockedNormal = Math.round(normal * strength * 0.1);
  const blockedExcess = Math.round(excess * strength);
  const passedNormal = normal - blockedNormal;
  const passedExcess = excess - blockedExcess;
  const syn = config.attackType === 'syn' ? passedExcess : 0;
  const halfOpen = Math.min(connections, state.halfOpen - Math.ceil(state.halfOpen / 3) + syn);
  const availableNormal = state.queueLegit + passedNormal;
  const availableExcess = state.queueAttack + (config.attackType === 'volume' ? passedExcess : 0);
  const served = Math.min(capacity, availableNormal + availableExcess);
  const [legitServed, attackServed] = split(served, availableNormal, availableExcess);
  const remainingNormal = availableNormal - legitServed;
  const remainingExcess = availableExcess - attackServed;
  const queueDepth = Math.min(Math.max(0, Math.min(queueCapacity, connections - halfOpen)), remainingNormal + remainingExcess);
  const [queueLegit, queueAttack] = split(queueDepth, remainingNormal, remainingExcess);
  const legitAvailabilityPercent = normal === 0 ? 100 : percent(legitServed, normal);
  const metrics: SimulationMetrics = {
    incoming: normal + excess, blocked: blockedNormal + blockedExcess,
    legitServed, attackServed, legitDropped: remainingNormal - queueLegit,
    attackDropped: remainingExcess - queueAttack + syn, queueDepth,
    cpuPercent: percent(served, capacity), bandwidthPercent: percent(passedNormal + passedExcess, bandwidth),
    connectionPercent: percent(halfOpen + queueDepth, connections), queuePercent: percent(queueDepth, queueCapacity),
    latencyMs: 50 + Math.round(queueDepth / capacity * 1000), legitAvailabilityPercent,
    status: legitAvailabilityPercent >= 90 ? 'normal' : legitAvailabilityPercent >= 50 ? 'degraded' : 'down',
  };
  const tick = state.tick + 1;
  return { tick, queueLegit, queueAttack, halfOpen, metrics, history: [...state.history, { tick, ...metrics }].slice(-60) };
}

export const simulationEngine: SimulationEngine = { createInitialState, stepSimulation };
