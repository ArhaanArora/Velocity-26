import type { SimulationConfig } from '../shared/simulationTypes';

export const normalTrafficPreset: SimulationConfig = {
  normalRps: 120,
  surgeRps: 0,
  serverCapacityRps: 250,
  serverCount: 1,
  queueCapacity: 200,
  rateLimitEnabled: false,
  filterStrength: 0.7,
  balancerEnabled: false,
};

export const trafficSurgePreset: SimulationConfig = {
  ...normalTrafficPreset,
  surgeRps: 650,
};

export const midnightOutagePreset: SimulationConfig = {
  ...normalTrafficPreset,
  normalRps: 180,
  surgeRps: 1000,
  queueCapacity: 180,
};
