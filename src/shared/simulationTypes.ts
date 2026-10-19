export type AttackType = "none" | "volume" | "syn";

export type SystemStatus =
  | "normal"
  | "degraded"
  | "down";

export interface SimulationConfig {
  legitRate: number;
  attackType: AttackType;
  attackRate: number;
  filterStrength: number;
  loadBalancer: boolean;
  serverCount: number;
  perServerCapacity: number;
  perServerBandwidth: number;
  perServerConnections: number;
  perServerQueue: number;
}

export interface SimulationMetrics {
  incoming: number;
  blocked: number;
  legitServed: number;
  attackServed: number;
  legitDropped: number;
  attackDropped: number;
  queueDepth: number;
  cpuPercent: number;
  bandwidthPercent: number;
  connectionPercent: number;
  queuePercent: number;
  latencyMs: number;
  legitAvailabilityPercent: number;
  status: SystemStatus;
}

export interface SimulationSnapshot
  extends SimulationMetrics {
  tick: number;
}

export interface SimulationState {
  tick: number;
  queueLegit: number;
  queueAttack: number;
  halfOpen: number;
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
