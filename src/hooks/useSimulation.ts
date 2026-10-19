import { useCallback, useEffect, useReducer } from 'react';
import { simulationEngine } from '../adapters/engineAdapter';
import { midnightOutagePreset, normalTrafficPreset } from '../lib/presets';
import { advanceStability, STABLE_TARGET } from '../lib/learning';
import type { SimulationConfig, SimulationState } from '../shared/simulationTypes';

export type Mode = 'sandbox' | 'challenge';
export interface Session {
  config: SimulationConfig;
  appliedConfig: SimulationConfig;
  state: SimulationState;
  running: boolean;
  started: boolean;
  stableTicks: number;
  completedAt: number | null;
  filterUsed: boolean;
  balancerUsed: boolean;
  maxServers: number;
}
interface LabState { mode: Mode; sandbox: Session; challenge: Session }
type Action =
  | { type: 'tick'; mode: Mode; manual?: boolean }
  | { type: 'config'; patch: Partial<SimulationConfig> }
  | { type: 'toggle' }
  | { type: 'reset' }
  | { type: 'preset'; config: SimulationConfig }
  | { type: 'switch'; mode: Mode }
  | { type: 'startChallenge' };

function createSession(mode: Mode): Session {
  const config = { ...(mode === 'challenge' ? midnightOutagePreset : normalTrafficPreset) };
  return { config, appliedConfig: { ...config }, state: simulationEngine.createInitialState(config), running: false, started: mode === 'sandbox', stableTicks: 0, completedAt: null, filterUsed: false, balancerUsed: false, maxServers: config.serverCount };
}
function initialState(): LabState { return { mode: 'sandbox', sandbox: createSession('sandbox'), challenge: createSession('challenge') }; }

function reducer(lab: LabState, action: Action): LabState {
  const mode = lab.mode;
  const current = lab[mode];
  let next = current;
  switch (action.type) {
    case 'switch':
      if (action.mode === mode) return lab;
      return { ...lab, mode: action.mode, [mode]: { ...current, running: false } };
    case 'config':
      // Challenge source rates stay fixed; infrastructure remains configurable.
      if (mode === 'challenge' && ('legitRate' in action.patch || 'attackRate' in action.patch || 'attackType' in action.patch)) return lab;
      if (!current.started || current.completedAt !== null) return lab;
      next = { ...current, config: { ...current.config, ...action.patch } };
      break;
    case 'toggle':
      if (!current.started || current.completedAt !== null) return lab;
      next = { ...current, running: !current.running };
      break;
    case 'tick': {
      if (action.mode !== mode || !current.started || current.completedAt !== null || (action.manual ? current.running : !current.running)) return lab;
      const state = simulationEngine.stepSimulation(current.config, current.state);
      const stableTicks = mode === 'challenge' ? advanceStability(current.stableTicks, state.metrics.legitAvailabilityPercent) : 0;
      const completedAt = mode === 'challenge' && stableTicks >= STABLE_TARGET ? state.tick : null;
      next = { ...current, state, appliedConfig: { ...current.config }, stableTicks, completedAt, running: completedAt === null && current.running, filterUsed: current.filterUsed || (current.config.filterStrength > 0), balancerUsed: current.balancerUsed || current.config.loadBalancer, maxServers: Math.max(current.maxServers, current.config.serverCount) };
      break;
    }
    case 'reset': next = createSession(mode); break;
    case 'preset':
      if (mode !== 'sandbox') return lab;
      next = { ...createSession(mode), config: { ...action.config }, appliedConfig: { ...action.config }, state: simulationEngine.createInitialState(action.config) };
      break;
    case 'startChallenge':
      if (mode !== 'challenge' || current.started) return lab;
      next = { ...current, started: true, running: true };
      break;
  }
  return { ...lab, [mode]: next };
}

export function useSimulation() {
  const [lab, dispatch] = useReducer(reducer, undefined, initialState);
  const session = lab[lab.mode];
  useEffect(() => {
    if (!session.running) return;
    const mode = lab.mode;
    const timer = window.setInterval(() => dispatch({ type: 'tick', mode }), 1000);
    return () => window.clearInterval(timer);
  }, [lab.mode, session.running]);
  return {
    mode: lab.mode,
    session,
    updateConfig: useCallback((patch: Partial<SimulationConfig>) => dispatch({ type: 'config', patch }), []),
    toggleRunning: () => dispatch({ type: 'toggle' }),
    step: () => dispatch({ type: 'tick', mode: lab.mode, manual: true }),
    reset: () => dispatch({ type: 'reset' }),
    applyPreset: (config: SimulationConfig) => dispatch({ type: 'preset', config }),
    switchMode: (mode: Mode) => dispatch({ type: 'switch', mode }),
    startChallenge: () => dispatch({ type: 'startChallenge' }),
  };
}
