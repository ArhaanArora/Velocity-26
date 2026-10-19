import { AlertCircle, Cable, Cpu, Gauge, Layers3, Radio } from 'lucide-react';
import type { SimulationMetrics } from '../shared/simulationTypes';

export function ResourceMeters({ metrics }: { metrics: SimulationMetrics }) {
  const resources = [
    { label: 'CPU', value: metrics.cpuPercent, icon: Cpu, detail: 'Processing utilization' },
    { label: 'Bandwidth', value: metrics.bandwidthPercent, icon: Radio, detail: 'Passed traffic / bandwidth capacity' },
    { label: 'Connections', value: metrics.connectionPercent, icon: Cable, detail: 'Half-open connections + queued requests' },
    { label: 'Request queue', value: metrics.queuePercent, icon: Layers3, detail: `${metrics.queueDepth} requests waiting` },
  ];
  const pressure = resources.find(resource => resource.value >= 90);
  return <section className="panel resources-panel" aria-label="System resources" data-tour="metrics">
    <div className="panel-heading"><div><span className="section-eyebrow"><Gauge size={15} /> Resources</span><h2>Where is the pressure?</h2></div><span className="tiny-tag">Live metrics</span></div>
    <div className="resource-list">{resources.map(({ label, value, icon: Icon, detail }) => {
      const tone = value >= 90 ? 'danger' : value >= 70 ? 'warning' : 'healthy';
      return <div key={label} className={`resource-item ${tone}`}><div className="resource-label"><span><Icon size={15} />{label}</span><strong>{value.toFixed(0)}<small>%</small></strong></div><div className="resource-bar" role="meter" aria-label={`${label} utilization`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}><i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div><p>{detail}</p></div>;
    })}</div>
    <div className={`resource-insight ${pressure ? 'has-pressure' : ''}`}><AlertCircle size={15} /><span>{pressure ? `${pressure.label} utilization is high. Compare it with customer availability.` : 'Resources have room to breathe. Try increasing traffic to see what changes.'}</span></div>
  </section>;
}
