import {
  SimulationEngine,
  SimulationConfig,
  SimulationState,
} from '../shared/simulationTypes';
import { createInitialState, stepSimulation } from './step';
import {
  normalTrafficPreset,
  trafficSurgePreset,
  midnightOutagePreset,
} from './presets';

export {
  createInitialState,
  stepSimulation,
  normalTrafficPreset,
  trafficSurgePreset,
  midnightOutagePreset,
};

export const simulationEngine: SimulationEngine = {
  createInitialState,
  stepSimulation,
};

export default simulationEngine;

