import {
  SimulationConfig,
  SimulationMetrics,
  SimulationSnapshot,
  SimulationState,
  SimulationEngine,
  AttackType,
  SystemStatus,
} from '../shared/simulationTypes';

export {
  SimulationConfig,
  SimulationMetrics,
  SimulationSnapshot,
  SimulationState,
  SimulationEngine,
  AttackType,
  SystemStatus,
};

export interface SanitizedConfig {
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
