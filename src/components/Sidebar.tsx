import { ArrowUpRight, Check, Filter, GripVertical, Network, Plus, Server, Target, X } from 'lucide-react';
import type { SimulationConfig } from '../shared/simulationTypes';
import type { Mode } from '../hooks/useSimulation';
import { trafficSurgePreset } from '../lib/presets';
import { useComponentDrag } from '../hooks/useComponentDrag';
import { RangeField, ServerStepper, ToggleField } from './ControlFields';

export type ComponentKind = 'filter' | 'balancer' | 'server';
interface Props {
  config: SimulationConfig; mode: Mode; disabled: boolean; selected: ComponentKind | null;
  onConfig: (patch: Partial<SimulationConfig>) => void; onPreset: (config: SimulationConfig) => void;
  onAdd: (kind: ComponentKind) => void; onSelect: (kind: ComponentKind | null) => void;
}

export function Sidebar({ config, mode, disabled, selected, onConfig, onAdd, onSelect }: Props) {
  const componentDrag = useComponentDrag(onAdd);
  const tools = [
    { kind: 'filter' as const, name: 'Rate Limiter', detail: 'Let less excess traffic through.', icon: Filter, placed: config.filterStrength > 0 },
    { kind: 'balancer' as const, name: 'Load Balancer', detail: 'Share the work across servers.', icon: Network, placed: config.loadBalancer },
    { kind: 'server' as const, name: 'Additional Server', detail: 'Give your store more capacity.', icon: Server, placed: config.serverCount >= 6 },
  ];
  return <aside className="sidebar" id="configuration" aria-label="Mission and tools" tabIndex={-1}>
    <section className="mission-card"><span className="eyebrow"><Target size={13} />Your objective</span><h2>{mode === 'sandbox' ? 'Keep Nova Store open.' : 'Bring the store back.'}</h2><p>{mode === 'sandbox' ? 'Change the traffic. Try a defense. See what your customers experience.' : 'Investigate failed page loads and restore at least 85% availability for 15 consecutive seconds.'}</p><span className="mission-footer">{mode === 'sandbox' ? 'A safe place to ask “what if?”' : 'One incident. Your investigation.'}</span></section>
    <section className="sidebar-section" data-tour="defenses"><div className="sidebar-section-heading"><h3>Your toolkit</h3><GripVertical size={15} /></div><p className="section-description">Drag into the network, or click to add.</p>
      <div className="palette">{tools.map(({ kind, name, detail, icon: Icon, placed }) => <div key={kind} className={`palette-item ${selected === kind ? 'selected' : ''} ${placed ? 'placed' : ''}`}>
        <button className="palette-add" disabled={disabled} {...componentDrag.handlers(kind, disabled || placed)} onClick={() => { if (componentDrag.consumeClick()) return; if (!placed) onAdd(kind); onSelect(kind); }} aria-label={`${placed ? 'Configure' : 'Add'} ${name}`}><span className="palette-icon"><Icon size={21} strokeWidth={1.7} /></span><span><strong>{name}</strong><small>{detail}</small></span>{placed ? <Check size={14} /> : <Plus size={14} />}</button>
      </div>)}</div>
      {selected && <section className="component-config" aria-label="Selected component configuration"><div className="component-config-heading"><strong>{selected === 'filter' ? 'Rate limiter' : selected === 'balancer' ? 'Load balancer' : 'Your servers'}</strong><button className="icon-button" onClick={() => onSelect(null)} aria-label="Close component settings"><X size={15} /></button></div>
        {selected === 'filter' ? <><ToggleField label="Filtering enabled" enabled={config.filterStrength > 0} disabled={disabled} onChange={() => onConfig({ filterStrength: config.filterStrength > 0 ? 0 : 0.7 })} />{config.filterStrength > 0 && <RangeField label="Filter strength" value={Math.round(config.filterStrength * 100)} max={100} step={5} unit="%" description="Stronger filtering also rejects some legitimate customers." disabled={disabled} onChange={value => onConfig({ filterStrength: value / 100 })} />}</> : <>
          {selected === 'balancer' && <ToggleField label="Load balancing" enabled={config.loadBalancer} disabled={disabled} onChange={() => onConfig({ loadBalancer: !config.loadBalancer })} />}
          <ServerStepper count={config.serverCount} disabled={disabled} onChange={serverCount => onConfig({ serverCount })} />
          {config.serverCount > 1 && !config.loadBalancer && <p className="small-warning">Only one server is active. Add a load balancer to share the work.</p>}
        </>}
      </section>}
    </section>
    <section className="sidebar-section traffic-tool" data-tour="traffic"><div className="sidebar-section-heading"><h3>{mode === 'sandbox' ? 'Turn up the traffic' : 'Customer reports'}</h3></div>
      {mode === 'sandbox' ? <><p className="section-description">What happens when more requests arrive?</p><RangeField label="Extra traffic" ariaLabel="Surge traffic" value={config.attackRate} max={10000} step={50} unit="req/s" description="Fictional traffic, competing with legitimate customer requests." disabled={disabled} onChange={attackRate => onConfig({ attackRate, attackType: config.attackType === 'none' && attackRate > 0 ? 'volume' : config.attackType })} /><button className="text-button surge-shortcut" disabled={disabled} onClick={() => onConfig({ attackType: 'volume', attackRate: trafficSurgePreset.attackRate })}>Try a traffic surge<ArrowUpRight size={13} /></button><span className="traffic-baseline">{config.legitRate} legitimate requests / second</span></> : <p className="customer-report">“The page won’t open.”<br />“Everything is unusually slow.”<span>The traffic is fixed for this investigation. Your infrastructure is yours to change.</span></p>}
    </section>
    <a href="#main" className="mobile-back-link">Back to the workspace ↑</a><div className="sidebar-footer"><span className="local-dot" /><span>Local. Deterministic. Entirely simulated.</span></div>
    {componentDrag.drag?.active && <div className="component-drag-preview" style={{ left: componentDrag.drag.x, top: componentDrag.drag.y }}><Plus size={16} /><span>{componentDrag.drag.kind === 'filter' ? 'Rate Limiter' : componentDrag.drag.kind === 'balancer' ? 'Load Balancer' : 'Additional Server'}<small>Release on its matching slot</small></span></div>}
  </aside>;
}
