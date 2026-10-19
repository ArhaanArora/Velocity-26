import { ChevronDown, CircleHelp, Filter, Layers3, Network, Plus, Server, Shield, SlidersHorizontal, Users, Waves, X } from 'lucide-react';
import type { SimulationConfig } from '../shared/simulationTypes';
import type { Mode } from '../hooks/useSimulation';
import { normalTrafficPreset, trafficSurgePreset } from '../lib/presets';
import { useComponentDrag } from '../hooks/useComponentDrag';

export type ComponentKind = 'filter' | 'balancer' | 'server';
interface Props {
  config: SimulationConfig; mode: Mode; disabled: boolean; selected: ComponentKind | null;
  onConfig: (patch: Partial<SimulationConfig>) => void;
  onPreset: (config: SimulationConfig) => void;
  onAdd: (kind: ComponentKind) => void;
  onSelect: (kind: ComponentKind | null) => void;
}

function Range({ label, value, min = 0, max, step = 1, unit, description, disabled, onChange }: {
  label: string; value: number; min?: number; max: number; step?: number; unit: string; description: string; disabled?: boolean; onChange: (value: number) => void;
}) {
  return <label className="range-field"><span className="range-label"><span>{label} <CircleHelp size={11} className="hint-icon" aria-label={description}><title>{description}</title></CircleHelp></span><strong>{value.toLocaleString()}<small>{unit}</small></strong></span>
    <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={event => onChange(Number(event.target.value))} aria-label={label} title={description} style={{ '--range-fill': `${(value - min) / (max - min) * 100}%` } as React.CSSProperties} />
    <span className="range-bounds"><span>{min.toLocaleString()}</span><span>{max.toLocaleString()} {unit}</span></span>
  </label>;
}

function Toggle({ label, enabled, disabled, onChange }: { label: string; enabled: boolean; disabled?: boolean; onChange: () => void }) {
  return <button className={`toggle-row ${enabled ? 'enabled' : ''}`} role="switch" aria-checked={enabled} disabled={disabled} onClick={onChange}><span>{label}</span><span className="toggle"><i /></span></button>;
}

export function Sidebar({ config, mode, disabled, selected, onConfig, onPreset, onAdd, onSelect }: Props) {
  const componentDrag = useComponentDrag(onAdd);
  const palette = [
    { kind: 'filter' as const, name: 'Rate Limiter', detail: 'Filter unwanted traffic', icon: Filter, installed: config.rateLimitEnabled },
    { kind: 'balancer' as const, name: 'Load Balancer', detail: 'Distribute incoming load', icon: Network, installed: config.balancerEnabled },
    { kind: 'server' as const, name: 'Additional Server', detail: 'Expand processing capacity', icon: Server, installed: config.serverCount >= 6 },
  ];
  return <aside className="sidebar" id="configuration" tabIndex={-1} aria-label="Simulation configuration">
    <div className="sidebar-heading"><SlidersHorizontal size={16} /><span>Lab configuration</span><span className="tiny-tag">LIVE</span><a className="mobile-back-link" href="#main">Back to network ↑</a></div>
    <section className="sidebar-section" data-tour="traffic">
      <div className="section-eyebrow"><Waves size={14} /> TRAFFIC SOURCES</div>
      {mode === 'sandbox' ? <label className="select-label">Quick scenario<span className="select-wrap"><select aria-label="Quick scenario" value="" disabled={disabled} onChange={event => { if (event.target.value) onPreset(event.target.value === 'normal' ? normalTrafficPreset : trafficSurgePreset); }}><option value="" disabled>Choose a preset</option><option value="normal">Normal traffic</option><option value="surge">Traffic surge</option></select><ChevronDown size={14} /></span></label> : <p className="sidebar-note">Incident traffic is fixed. Investigate the metrics and adjust your defenses.</p>}
      <div className="source-label"><span className="source-dot green" /><Users size={13} /> Legitimate users</div>
      <Range label="Normal traffic" value={config.normalRps} max={600} step={10} unit="req/s" description="Requests from legitimate users each simulated second." disabled={disabled || mode === 'challenge'} onChange={normalRps => onConfig({ normalRps })} />
      <div className="source-label"><span className="source-dot red" /><Waves size={13} /> Simulated excess traffic</div>
      <Range label="Surge traffic" value={config.surgeRps} max={2000} step={10} unit="req/s" description="Fictional volume traffic competing for server resources." disabled={disabled || mode === 'challenge'} onChange={surgeRps => onConfig({ surgeRps })} />
      <div className="inline-note">Volume simulation <span>·</span> No external traffic</div>
    </section>
    <section className="sidebar-section">
      <div className="section-eyebrow"><Server size={14} /> INFRASTRUCTURE</div>
      <Range label="Capacity per server" value={config.serverCapacityRps} min={50} max={1000} step={50} unit="req/s" description="Maximum requests processed by each active server per second." disabled={disabled} onChange={serverCapacityRps => onConfig({ serverCapacityRps })} />
      <div className="count-field"><span>Server count</span><div className="stepper"><button aria-label="Remove one server" disabled={disabled || config.serverCount <= 1} onClick={() => onConfig({ serverCount: config.serverCount - 1 })}>−</button><output aria-label="Server count">{config.serverCount}</output><button aria-label="Add one server" disabled={disabled || config.serverCount >= 6} onClick={() => onAdd('server')}>+</button></div></div>
      <Range label="Queue capacity" value={config.queueCapacity} max={1000} step={20} unit="req" description="Total requests that can wait for processing. A larger queue absorbs bursts but can increase latency." disabled={disabled} onChange={queueCapacity => onConfig({ queueCapacity })} />
      {config.serverCount > 1 && !config.balancerEnabled && <p className="small-warning">Enable load balancing to use your extra servers.</p>}
    </section>
    <section className="sidebar-section palette-section" data-tour="defenses">
      <div className="section-eyebrow"><Shield size={14} /> DEFENSE TOOLKIT <span className="tiny-tag">{Number(config.rateLimitEnabled) + Number(config.balancerEnabled)} ACTIVE</span></div>
      <p className="section-description">Drag onto a slot, or click to add.</p>
      <div className="palette">
        {palette.map(({ kind, name, detail, icon: Icon, installed }) => <div key={kind} className={`palette-item ${selected === kind ? 'selected' : ''}`}>
          <button className="palette-add" disabled={disabled} {...componentDrag.handlers(kind, disabled || installed)} onClick={() => { if (componentDrag.consumeClick()) return; if (!installed) onAdd(kind); onSelect(kind); }} aria-label={`${installed ? 'Configure' : 'Add'} ${name}`}><span className="palette-icon"><Icon size={18} /></span><span><strong>{name}</strong><small>{detail}</small></span>{installed ? <span className="installed-dot" /> : <Plus size={15} />}</button>
        </div>)}
      </div>
      <div className="defense-settings">
        <Toggle label="Rate limiter" enabled={config.rateLimitEnabled} disabled={disabled} onChange={() => onConfig({ rateLimitEnabled: !config.rateLimitEnabled })} />
        {config.rateLimitEnabled && <Range label="Filter strength" value={Math.round(config.filterStrength * 100)} max={100} step={5} unit="%" description="Share of surge traffic blocked. Also blocks a smaller share of legitimate traffic in the mock." disabled={disabled} onChange={value => onConfig({ filterStrength: value / 100 })} />}
        <Toggle label="Load balancer" enabled={config.balancerEnabled} disabled={disabled} onChange={() => onConfig({ balancerEnabled: !config.balancerEnabled })} />
      </div>
      {selected && <div className="selection-note"><span><Layers3 size={13} /> Selected: {selected === 'filter' ? 'Rate Limiter' : selected === 'balancer' ? 'Load Balancer' : 'Servers'}</span><button className="icon-button" aria-label="Clear component selection" onClick={() => onSelect(null)}><X size={12} /></button></div>}
    </section>
    <div className="sidebar-footer"><Shield size={15} /><p>A safe space to experiment.<br /><span>Mathematical simulation only.</span></p></div>
    {componentDrag.drag?.active && <div className="component-drag-preview" style={{ left: componentDrag.drag.x, top: componentDrag.drag.y }}><Plus size={15} /><span>{componentDrag.drag.kind === 'filter' ? 'Rate Limiter' : componentDrag.drag.kind === 'balancer' ? 'Load Balancer' : 'Additional Server'}<small>Release on the matching network slot</small></span></div>}
  </aside>;
}
