import { ArrowUpRight, Check, Filter, GripVertical, Network, Plus, Server, Target, X } from 'lucide-react';
import type { AttackType, SimulationConfig } from '../shared/simulationTypes';
import type { Mode } from '../hooks/useSimulation';
import { normalTrafficPreset, trafficSurgePreset } from '../lib/presets';
import { useComponentDrag } from '../hooks/useComponentDrag';
import { RangeField, ServerStepper, ToggleField } from './ControlFields';

export type ComponentKind = 'filter' | 'balancer' | 'server';
interface Props {
  config: SimulationConfig; mode: Mode; disabled: boolean; selected: ComponentKind | null;
  onConfig: (patch: Partial<SimulationConfig>) => void; onPreset: (config: SimulationConfig) => void;
  onAdd: (kind: ComponentKind) => void; onSelect: (kind: ComponentKind | null) => void;
}

export function Sidebar({ config, mode, disabled, selected, onConfig, onPreset, onAdd, onSelect }: Props) {
  const componentDrag = useComponentDrag(onAdd);
  const tools = [
    { kind: 'filter' as const, name: 'Rate Limiter', detail: 'Let less excess traffic through.', icon: Filter, placed: config.filterStrength > 0 },
    { kind: 'balancer' as const, name: 'Load Balancer', detail: 'Share the work across servers.', icon: Network, placed: config.loadBalancer },
    { kind: 'server' as const, name: 'Additional Server', detail: 'Give your store more capacity.', icon: Server, placed: config.serverCount >= 6 },
  ];
  return <aside className="sidebar" id="configuration" aria-label="Mission and tools" tabIndex={-1}>
    <section className="mission-card"><span className="eyebrow"><Target size={13} />Your objective</span><h2>{mode === 'sandbox' ? 'Keep Nova Store open.' : 'Bring the store back.'}</h2><p>{mode === 'sandbox' ? 'Change the traffic. Try a defense. See what your customers experience.' : 'Investigate failed page loads and restore at least 85% availability for 15 consecutive seconds.'}</p><span className="mission-footer">{mode === 'sandbox' ? 'A safe place to ask “what if?”' : 'One incident. Your investigation.'}</span></section>
    <section className="traffic-tool" data-tour="traffic" aria-label="Traffic controls">
      <RangeField label="Real visitors" ariaLabel="Normal traffic" value={config.legitRate} max={600} step={10} unit="req/s" description="Legitimate traffic" disabled={disabled || mode==='challenge'} onChange={legitRate=>onConfig({legitRate})}/>
      <RangeField label="Excess traffic" description="Simulated requests only" ariaLabel="Surge traffic" value={config.attackRate} max={10000} step={50} unit="req/s" disabled={disabled || mode==='challenge'} onChange={attackRate=>onConfig({attackRate,attackType:config.attackType==='none' && attackRate>0?'volume':config.attackType})}/>
      <label className="select-label">Attack scenario<select aria-label="Scenario type" value={config.attackType} disabled={disabled || mode==='challenge'} onChange={event=>onConfig({attackType:event.target.value as AttackType})}><option value="none">None</option><option value="volume">Volume overload</option><option value="syn">SYN connections</option></select></label>
      {mode==='sandbox' ? <button className="text-button surge-shortcut" disabled={disabled} onClick={()=>onConfig({attackType:'volume',attackRate:trafficSurgePreset.attackRate})}>Try a traffic surge<ArrowUpRight size={13}/></button> : <p className="field-description">Incident traffic is fixed. Investigate and adjust your defenses.</p>}
    </section>
    <section className="sidebar-section" data-tour="defenses"><div className="sidebar-section-heading"><h3>Your toolkit</h3><GripVertical size={15} /></div><p className="section-description">Drag into the network, or click to add.</p>
      <div className="palette">{tools.map(({ kind, name, detail, icon: Icon, placed }) => <div key={kind} className={`palette-item ${selected === kind ? 'selected' : ''} ${placed ? 'placed' : ''}`}>
        <button className="palette-add" disabled={disabled} {...componentDrag.handlers(kind, disabled || placed)} onClick={() => { if (componentDrag.consumeClick()) return; if (!placed) onAdd(kind); onSelect(kind); }} aria-label={`${placed ? 'Configure' : 'Add'} ${name}`}><span className="palette-icon"><Icon size={21} strokeWidth={1.7} /></span><span><strong>{name}</strong><small>{detail}</small></span>{placed ? <Check size={14} /> : <Plus size={14} />}</button>
      </div>)}</div>
      {selected && <section className="component-config" aria-label="Selected component configuration"><div className="component-config-heading"><strong>{selected === 'filter' ? 'Rate limiter' : selected === 'balancer' ? 'Load balancer' : 'Your servers'}</strong><button className="icon-button" onClick={() => onSelect(null)} aria-label="Close component settings"><X size={15} /></button></div>
        {selected === 'filter' ? <><ToggleField label="Protect traffic" enabled={config.filterStrength > 0} disabled={disabled} onChange={() => onConfig({ filterStrength: config.filterStrength > 0 ? 0 : 0.7 })} />{config.filterStrength > 0 && <RangeField label="Filter strength" value={Math.round(config.filterStrength * 100)} max={100} step={5} unit="%" description="Stronger filtering also rejects some legitimate customers." disabled={disabled} onChange={value => onConfig({ filterStrength: value / 100 })} />}</> : <>
          {selected === 'balancer' && <ToggleField label="Share server workload" enabled={config.loadBalancer} disabled={disabled} onChange={() => onConfig({ loadBalancer: !config.loadBalancer })} />}
          <ServerStepper count={config.serverCount} disabled={disabled} onChange={serverCount => onConfig({ serverCount })} />
          {config.serverCount > 1 && !config.loadBalancer && <p className="small-warning">Only one server is active. Add a load balancer to share the work.</p>}
        </>}
      </section>}
    </section>
    <details className="advanced-controls"><summary>Advanced server settings</summary>
      <ServerStepper count={config.serverCount} disabled={disabled} onChange={serverCount=>onConfig({serverCount})}/>
      <RangeField label="Processing per server" description="Requests processed each second." value={config.perServerCapacity} min={50} max={1000} step={50} unit="req/s" disabled={disabled} onChange={perServerCapacity=>onConfig({perServerCapacity})}/>
      <RangeField label="Bandwidth per server" description="Utilization reference; does not throttle processing." value={config.perServerBandwidth} min={100} max={5000} step={100} unit="req/s" disabled={disabled} onChange={perServerBandwidth=>onConfig({perServerBandwidth})}/>
      <RangeField label="Connections per server" description="Slots shared by queues and SYN handshakes." value={config.perServerConnections} min={50} max={2000} step={50} unit="slots" disabled={disabled} onChange={perServerConnections=>onConfig({perServerConnections})}/>
      <RangeField label="Queue per server" description="Waiting room; limited by available connections." value={config.perServerQueue} max={2000} step={50} unit="requests" disabled={disabled} onChange={perServerQueue=>onConfig({perServerQueue})}/>
      {mode==='sandbox' && <button className="text-button" disabled={disabled} onClick={()=>onPreset(normalTrafficPreset)}>Restore normal traffic preset</button>}
    </details>
    <a href="#main" className="mobile-back-link">Back to the workspace ↑</a><div className="sidebar-footer"><span className="local-dot" /><span>Local. Deterministic. Entirely simulated.</span></div>
    {componentDrag.drag?.active && <div className="component-drag-preview" style={{ left: componentDrag.drag.x, top: componentDrag.drag.y }}><Plus size={16} /><span>{componentDrag.drag.kind === 'filter' ? 'Rate Limiter' : componentDrag.drag.kind === 'balancer' ? 'Load Balancer' : 'Additional Server'}<small>Release on its matching slot</small></span></div>}
  </aside>;
}
