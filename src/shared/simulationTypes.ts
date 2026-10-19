
export interface SimulationConfig {
  normalRps: number;
  surgeRps: number;

  serverCapacityRps: number;
  serverCount: number;
  queueCapacity: number;

  rateLimitEnabled: boolean;
  filterStrength: number;
  balancerEnabled: boolean;
}

export interface SimulationMetrics {
  incoming: number;
  blocked: number;

  servedNormal: number;
  servedSurge: number;

  droppedNormal: number;
  droppedSurge: number;

  queueDepth: number;

  cpuPct: number;
  bandwidthPct: number;
  connectionPct: number;
  queuePct: number;

  latencyMs: number;
  availabilityPct: number;
}

export interface SimulationSnapshot
  extends SimulationMetrics {
  tick: number;
}

export interface SimulationState {
  tick: number;
  metrics: SimulationMetrics;
  history: SimulationSnapshot[];
}

export interface SimulationEngine {
  createInitialState(
    config: SimulationConfig
  ): SimulationState;

  stepSimulation(
    config: SimulationConfig,
    state: SimulationState
  ): SimulationState;
}
