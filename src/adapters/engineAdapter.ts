// Production integration boundary. Engine errors surface without a mock fallback.
export {
  simulationEngine,
  normalTrafficPreset,
  trafficSurgePreset,
  midnightOutagePreset,
} from '../engine';
