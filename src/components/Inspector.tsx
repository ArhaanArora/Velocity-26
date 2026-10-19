import { lazy, Suspense, useEffect, useRef } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import type { AttackType, SimulationConfig, SimulationState } from '../shared/simulationTypes';
import type { Mode } from '../hooks/useSimulation';
import { normalTrafficPreset, trafficSurgePreset } from '../lib/presets';
import { RangeField, ServerStepper } from './ControlFields';
import { ResourceMeters } from './ResourceMeters';

const TrafficChart = lazy(() => import('./TrafficChart').then(module => ({ default: module.TrafficChart })));

export function Inspector({ config, state, mode, disabled, onConfig, onPreset, onClose }: {
  config: SimulationConfig; state: SimulationState; mode: Mode; disabled: boolean;
  onConfig: (patch: Partial<SimulationConfig>) => void; onPreset: (config: SimulationConfig) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }, []);
  const m = state.metrics;
  const stats = [ ['Incoming', m.incoming, 'req/s'], ['Served', m.legitServed + m.attackServed, 'req/s'], ['Blocked', m.blocked, 'req/s'], ['Dropped', m.legitDropped + m.attackDropped, 'req/s'], ['Modeled latency', m.latencyMs, 'ms'], ['Half-open connections', state.halfOpen, 'slots'] ] as const;
  return <section className="inspector" id="system-inspector" aria-labelledby="inspector-title" ref={ref}>
    <div className="inspector-heading"><div><span className="eyebrow"><SlidersHorizontal size={13} /> A closer look</span><h2 id="inspector-title">System inspector</h2><p>The full picture, one simulated second at a time.</p></div><button className="icon-button" onClick={onClose} aria-label="Close system inspector"><X size={20} /></button></div>
    <div className="inspector-layout"><div className="inspector-observations" data-tour="metrics">
      <ResourceMeters metrics={m} />
      <dl className="technical-stats">{stats.map(([label, value, unit]) => <div key={label}><dt>{label}</dt><dd>{value.toLocaleString()}<span>{unit}</span></dd></div>)}</dl>
      <Suspense fallback={<div className="panel chart-loading" role="status">Loading traffic history…</div>}><TrafficChart state={state} /></Suspense>
    </div><section className="advanced-config" aria-label="Advanced configuration"><h3>Fine-tune the system</h3><p>Settings apply on the next tick. Rates are requests per simulated second.</p>
      {mode === 'sandbox' && <label className="select-label">Start from a preset<span className="select-wrap"><select aria-label="Quick scenario" value="" disabled={disabled} onChange={event => onPreset(event.target.value === 'normal' ? normalTrafficPreset : trafficSurgePreset)}><option value="" disabled>Choose a preset</option><option value="normal">Normal traffic</option><option value="surge">Traffic surge</option></select><ChevronDown size={14} /></span></label>}
      <RangeField label="Legitimate traffic" ariaLabel="Normal traffic" value={config.legitRate} max={600} step={10} unit="req/s" description="Requests arriving from legitimate customers." disabled={disabled || mode === 'challenge'} onChange={legitRate => onConfig({ legitRate })} />
      <label className="select-label">Excess traffic type<span className="select-wrap"><select aria-label="Scenario type" value={config.attackType} disabled={disabled || mode === 'challenge'} onChange={event => onConfig({ attackType: event.target.value as AttackType })}><option value="none">None</option><option value="volume">Volume overload</option><option value="syn">SYN connection exhaustion</option></select><ChevronDown size={14} /></span></label>
      <div className="config-divider" /><ServerStepper count={config.serverCount} disabled={disabled} onChange={serverCount => onConfig({ serverCount })} />
      <RangeField label="Processing per server" ariaLabel="Capacity per server" value={config.perServerCapacity} min={50} max={1000} step={50} unit="req/s" description="How many requests each active server can process per second." disabled={disabled} onChange={perServerCapacity => onConfig({ perServerCapacity })} />
      <RangeField label="Bandwidth per server" value={config.perServerBandwidth} min={100} max={5000} step={100} unit="req/s" description="Bandwidth reference for utilization. It does not throttle processing in this model." disabled={disabled} onChange={perServerBandwidth => onConfig({ perServerBandwidth })} />
      <RangeField label="Connections per server" value={config.perServerConnections} min={50} max={2000} step={50} unit="slots" description="Space shared by waiting requests and half-open SYN connections." disabled={disabled} onChange={perServerConnections => onConfig({ perServerConnections })} />
      <RangeField label="Queue per server" ariaLabel="Queue capacity" value={config.perServerQueue} max={2000} step={50} unit="requests" description="Requests that can wait. Free connection slots may limit this further." disabled={disabled} onChange={perServerQueue => onConfig({ perServerQueue })} />
      <details className="model-details"><summary>How this model works</summary><p>All activity is local mathematics. Volume traffic competes for processing. SYN traffic fills half-open connections and reduces queue room, but does not directly block immediate processing. Balancing scales all four resources across your servers. Filtering can reject legitimate requests too.</p></details>
    </section></div>
  </section>;
}
