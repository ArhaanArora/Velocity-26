import {
  SimulationConfig,
  SimulationState,
  SimulationSnapshot,
  SimulationMetrics,
} from '../shared/simulationTypes';
import { clamp, split } from './split';
import { filterTraffic } from './filter';
import { computeMetrics } from './metrics';

/**
 * Creates the initial valid simulation state at tick 0.
 */
export function createInitialState(_config?: SimulationConfig): SimulationState {
  const initialMetrics: SimulationMetrics = {
    incoming: 0,
    blocked: 0,
    legitServed: 0,
    attackServed: 0,
    legitDropped: 0,
    attackDropped: 0,
    queueDepth: 0,
    cpuPercent: 0,
    bandwidthPercent: 0,
    connectionPercent: 0,
    queuePercent: 0,
    latencyMs: 50,
    legitAvailabilityPercent: 100,
    status: 'normal',
  };

  return {
    tick: 0,
    queueLegit: 0,
    queueAttack: 0,
    halfOpen: 0,
    metrics: initialMetrics,
    history: [],
  };
}

/**
 * Advances the simulation by exactly one tick (one simulated second).
 * Returns a new immutable state without mutating the previous state.
 */
export function stepSimulation(
  config: SimulationConfig,
  state: SimulationState
): SimulationState {
  // Config sanitization per MODEL.md
  const legitRate = Math.max(0, config.legitRate);
  const attackRate = Math.max(0, config.attackRate);
  const filterStrength = clamp(config.filterStrength, 0, 1);
  const perServerCapacity = Math.max(1, config.perServerCapacity);
  const perServerBandwidth = Math.max(1, config.perServerBandwidth);
  const perServerConnections = Math.max(1, config.perServerConnections);
  const perServerQueue = Math.max(0, config.perServerQueue);

  // Step 0: Effective server scaling (MODEL.md Phase 2)
  const effectiveServers = config.loadBalancer ? Math.max(1, config.serverCount) : 1;
  const capacity = perServerCapacity * effectiveServers;
  const bandwidthCap = perServerBandwidth * effectiveServers;
  const connectionSlots = perServerConnections * effectiveServers;
  const queueCapacity = perServerQueue * effectiveServers;

  // Step 1: Arrivals
  const legitIn = legitRate;
  const attackIn = config.attackType === 'none' ? 0 : attackRate;

  // Step 2: Traffic Filtering (Phase 1 returns 0 blocked)
  const { attackBlocked, legitBlocked, attackPassed, legitPassed } = filterTraffic(
    legitIn,
    attackIn,
    filterStrength
  );

  // Step 3: Half-open connections (SYN flood accounting)
  const halfOpenOld = Math.max(0, state.halfOpen);
  const halfOpenKept = Math.max(0, halfOpenOld - Math.ceil(halfOpenOld / 3));
  const synPassed = config.attackType === 'syn' ? attackPassed : 0;
  const volumePassed = config.attackType === 'volume' ? attackPassed : 0;
  const halfOpenNew = Math.min(connectionSlots, halfOpenKept + synPassed);

  // Step 4: Queue room
  const queueLimit = Math.max(
    0,
    Math.min(queueCapacity, connectionSlots - halfOpenNew)
  );

  // Step 5: Available requests
  const queueLegitOld = Math.max(0, state.queueLegit);
  const queueAttackOld = Math.max(0, state.queueAttack);
  const legitAvail = queueLegitOld + legitPassed;
  const attackAvail = queueAttackOld + volumePassed;

  // Step 6: Served
  const servedTotal = Math.min(capacity, legitAvail + attackAvail);
  const [legitServed, attackServed] = split(
    servedTotal,
    legitAvail,
    attackAvail
  );

  // Step 7: Remaining unserved
  const legitRem = legitAvail - legitServed;
  const attackRem = attackAvail - attackServed;

  // Step 8: Queue buffering
  const queueTotal = Math.min(queueLimit, legitRem + attackRem);
  const [queueLegitNew, queueAttackNew] = split(
    queueTotal,
    legitRem,
    attackRem
  );

  // Step 9: Dropped requests
  const legitDropped = legitRem - queueLegitNew;
  const volumeDropped = attackRem - queueAttackNew;
  const attackDropped = volumeDropped + synPassed;

  // Step 11: Metrics calculation
  const metrics = computeMetrics({
    legitIn,
    attackIn,
    legitBlocked,
    attackBlocked,
    legitPassed,
    attackPassed,
    legitServed,
    attackServed,
    legitDropped,
    attackDropped,
    queueTotal,
    halfOpenNew,
    capacity,
    bandwidthCap,
    connectionSlots,
    queueCapacity,
  });

  // Step 12: Next state and rolling history (at most 60 snapshots)
  const nextTick = state.tick + 1;
  const snapshot: SimulationSnapshot = {
    tick: nextTick,
    ...metrics,
  };

  const nextHistory = [...state.history, snapshot].slice(-60);

  return {
    tick: nextTick,
    queueLegit: queueLegitNew,
    queueAttack: queueAttackNew,
    halfOpen: halfOpenNew,
    metrics,
    history: nextHistory,
  };
}
