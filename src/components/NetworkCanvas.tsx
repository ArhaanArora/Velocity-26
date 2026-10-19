import { Activity, ArrowDown, Check, Filter, Grip, Maximize2, Network, Plus, Server, Users, Waves, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SimulationConfig, SimulationMetrics } from '../shared/simulationTypes';
import type { ComponentKind } from './Sidebar';
import { systemStatus } from '../lib/learning';

interface Props {
  config: SimulationConfig; metrics: SimulationMetrics; running: boolean; tick: number; disabled: boolean;
  selected: ComponentKind | null; onSelect: (kind: ComponentKind) => void;
  onAdd: (kind: ComponentKind) => void; onRemove: (kind: ComponentKind) => void;
}

export function NetworkCanvas({ config, metrics, running, tick, disabled, selected, onSelect, onAdd, onRemove }: Props) {
  const [dragOver, setDragOver] = useState<ComponentKind | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [expanded]);
  const status = systemStatus(metrics);
  function dropProps(kind: ComponentKind) {
    return {
      'data-drop-slot': kind,
      onDragOver: (event: React.DragEvent) => { if (disabled) return; event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDragOver(kind); },
      onDragLeave: () => setDragOver(null),
      onDrop: (event: React.DragEvent) => { event.preventDefault(); setDragOver(null); if (!disabled && event.dataTransfer.getData('text/plain') === `cyberlab:${kind}`) onAdd(kind); },
    };
  }
  return <section className={`panel network-panel ${expanded ? 'network-expanded' : ''}`} data-tour="network" aria-label="Live network topology">
    <div className="panel-heading"><div><span className="section-eyebrow"><Network size={15} /> NETWORK TOPOLOGY</span><h2>Your network, in motion<span className="live-indicator"><i />{running ? 'LIVE' : 'PAUSED'}</span></h2></div><button className="icon-button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Collapse network view' : 'Expand network view'} title={expanded ? 'Collapse view' : 'Expand view'}>{expanded ? <X size={17} /> : <Maximize2 size={17} />}</button></div>
    <div className="topology-scroll"><div className="topology" data-running={running}>
      <svg className="traffic-lines" viewBox="0 0 1000 340" preserveAspectRatio="none" aria-hidden="true">
        <path className="connection-base" d="M 100 99 H 220 Q 245 99 245 124 V 145 Q 245 170 270 170 H 370" />
        <path className="connection-base" d="M 100 248 H 220 Q 245 248 245 223 V 195 Q 245 170 270 170 H 370" />
        <path className="connection-base" d="M 370 170 H 850" />
        <path className={`traffic-path green-flow ${config.normalRps === 0 ? 'no-flow' : ''}`} d="M 100 99 H 220 Q 245 99 245 124 V 145 Q 245 170 270 170 H 370" />
        <path className={`traffic-path red-flow ${config.surgeRps === 0 ? 'no-flow' : ''}`} d="M 100 248 H 220 Q 245 248 245 223 V 195 Q 245 170 270 170 H 370" />
        <path className={`traffic-path cyan-flow ${metrics.incoming - metrics.blocked === 0 ? 'no-flow' : ''}`} d="M 370 170 H 850" />
        {metrics.blocked > 0 && <><path className="blocked-line" d="M 370 193 V 275" /><path className="traffic-path blocked-flow" d="M 370 193 V 275" /></>}
      </svg>
      <div className="topology-stage-label source-stage">TRAFFIC SOURCES</div><div className="topology-stage-label defense-stage">DEFENSE LAYER</div><div className="topology-stage-label server-stage">YOUR INFRASTRUCTURE</div>
      <div className="network-node source-node normal-source"><span className="node-icon"><Users size={25} /></span><strong>Legitimate users</strong><span className="node-number">{config.normalRps.toLocaleString()}<small> req/s</small></span><span className="node-footnote">Normal traffic</span></div>
      <div className={`network-node source-node surge-source ${config.surgeRps === 0 ? 'inactive' : ''}`}><span className="node-icon"><Waves size={25} /></span><strong>Excess traffic</strong><span className="node-number">{config.surgeRps.toLocaleString()}<small> req/s</small></span><span className="node-footnote">Simulated volume</span></div>
      <div className={`network-node defense-node filter-node ${config.rateLimitEnabled ? 'installed' : 'empty-slot'} ${selected === 'filter' ? 'selected' : ''} ${dragOver === 'filter' ? 'drag-over' : ''}`} {...dropProps('filter')}>
        <button className="node-main" disabled={disabled} onClick={() => config.rateLimitEnabled ? onSelect('filter') : onAdd('filter')} aria-label={config.rateLimitEnabled ? 'Select Rate Limiter' : 'Add Rate Limiter to network'}><span className="node-icon"><Filter size={24} /></span><strong>Rate Limiter</strong><span className="node-detail">{config.rateLimitEnabled ? `${Math.round(config.filterStrength * 100)}% strength` : 'Drop or click to add'}</span><span className={`node-state ${config.rateLimitEnabled ? 'text-cyan' : ''}`}>{config.rateLimitEnabled ? <><Check size={11} /> ACTIVE</> : <><Plus size={11} /> EMPTY SLOT</>}</span></button>
        {config.rateLimitEnabled && <button className="node-remove" disabled={disabled} onClick={() => onRemove('filter')} aria-label="Remove Rate Limiter"><X size={12} /></button>}
      </div>
      {metrics.blocked > 0 && <div className="blocked-label"><ArrowDown size={12} /> {metrics.blocked} blocked /s</div>}
      <div className={`network-node defense-node balancer-node ${config.balancerEnabled ? 'installed' : 'empty-slot'} ${selected === 'balancer' ? 'selected' : ''} ${dragOver === 'balancer' ? 'drag-over' : ''}`} {...dropProps('balancer')}>
        <button className="node-main" disabled={disabled} onClick={() => config.balancerEnabled ? onSelect('balancer') : onAdd('balancer')} aria-label={config.balancerEnabled ? 'Select Load Balancer' : 'Add Load Balancer to network'}><span className="node-icon"><Network size={24} /></span><strong>Load Balancer</strong><span className="node-detail">{config.balancerEnabled ? `${config.serverCount} server${config.serverCount === 1 ? '' : 's'} connected` : 'Drop or click to add'}</span><span className={`node-state ${config.balancerEnabled ? 'text-cyan' : ''}`}>{config.balancerEnabled ? <><Check size={11} /> ACTIVE</> : <><Plus size={11} /> EMPTY SLOT</>}</span></button>
        {config.balancerEnabled && <button className="node-remove" disabled={disabled} onClick={() => onRemove('balancer')} aria-label="Remove Load Balancer"><X size={12} /></button>}
      </div>
      <div className={`network-node server-node ${selected === 'server' ? 'selected' : ''} ${dragOver === 'server' ? 'drag-over' : ''}`} {...dropProps('server')}>
        <button className="server-heading" onClick={() => onSelect('server')}><Server size={18} /><strong>Server pool</strong><span className={`status-dot ${status.tone}`} /></button>
        <div className="server-rack">{Array.from({ length: config.serverCount }, (_, index) => <div key={index} className={`server-row ${index > 0 && !config.balancerEnabled ? 'standby' : ''}`}><Grip size={14} /><span>server-{String(index + 1).padStart(2, '0')}</span><i /><small>{index > 0 && !config.balancerEnabled ? 'idle' : 'active'}</small></div>)}</div>
        <div className="server-capacity">{(config.serverCapacityRps * (config.balancerEnabled ? config.serverCount : 1)).toLocaleString()} <span>req/s effective</span></div>
        <div className="server-node-actions"><button disabled={disabled || config.serverCount >= 6} onClick={() => onAdd('server')} aria-label="Add server to network"><Plus size={12} /> Add server</button>{config.serverCount > 1 && <button disabled={disabled} onClick={() => onRemove('server')} aria-label="Remove server from network"><X size={13} /></button>}</div>
      </div>
      <span className="path-caption">{Math.max(0, metrics.incoming - metrics.blocked).toLocaleString()} req/s passing filter</span>
    </div></div>
    <div className="topology-footer"><div className="legend"><span><i className="green" />Legitimate</span><span><i className="red" />Excess</span><span><i className="grey" />Blocked</span></div><span className="tick-label"><Activity size={12} /> TICK <b data-testid="tick">{String(tick).padStart(3, '0')}</b><span>·</span>1 tick = 1 second</span></div>
  </section>;
}
