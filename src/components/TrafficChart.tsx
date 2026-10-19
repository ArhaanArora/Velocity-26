import { ChartNoAxesCombined } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SimulationState } from '../shared/simulationTypes';

const series = [
  { key: 'incoming', name: 'Incoming', color: '#22d3ee' },
  { key: 'served', name: 'Served', color: '#4ade80' },
  { key: 'blocked', name: 'Blocked', color: '#94a3b8' },
  { key: 'dropped', name: 'Dropped', color: '#f87171' },
];

export function TrafficChart({ state }: { state: SimulationState }) {
  const data = state.history.map(snapshot => ({ ...snapshot, served: snapshot.legitServed + snapshot.attackServed, dropped: snapshot.legitDropped + snapshot.attackDropped }));
  return <section className="panel chart-panel" aria-label="Traffic analytics">
    <div className="panel-heading"><div><span className="section-eyebrow"><ChartNoAxesCombined size={15} /> TRAFFIC ANALYTICS</span><h2>See the bigger picture</h2></div><span className="chart-window">Last 60 ticks</span></div>
    <div className="chart-legend">{series.map(item => <span key={item.key}><i style={{ background: item.color }} />{item.name}</span>)}<span className="chart-unit">requests / second</span></div>
    <div className="traffic-chart" role="img" aria-label={`Traffic history, ${data.length} snapshots. Latest: ${state.metrics.incoming} incoming, ${state.metrics.legitServed + state.metrics.attackServed} served, ${state.metrics.blocked} blocked, ${state.metrics.legitDropped + state.metrics.attackDropped} dropped requests per second.`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={data} margin={{ top: 16, right: 20, left: -16, bottom: 2 }} accessibilityLayer>
          <CartesianGrid stroke="#223149" vertical={false} strokeDasharray="3 5" />
          <XAxis dataKey="tick" type="number" domain={data.length <= 1 ? [0, 10] : ['dataMin', 'dataMax']} allowDecimals={false} minTickGap={35} tick={{ fill: '#8c9bb0', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={value => `${value}s`} dy={8} />
          <YAxis tick={{ fill: '#8c9bb0', fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} width={52} />
          <Tooltip contentStyle={{ background: '#111d30', border: '1px solid #33465f', borderRadius: 10, fontSize: 12, boxShadow: '0 10px 30px #0005' }} labelStyle={{ color: '#c9d5e5', marginBottom: 6 }} labelFormatter={value => `Tick ${value} · requests/s`} />
          {series.map(item => <Line key={item.key} type="linear" dataKey={item.key} name={item.name} stroke={item.color} strokeWidth={2} dot={data.length === 1 ? { r: 4, strokeWidth: 0 } : false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#111d30' }} isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
    <div className="chart-footer"><span>{data.length === 0 ? 'Run or Step to collect the first snapshot.' : 'Each point is one simulated second.'}</span><span>{state.history.length} / 60 snapshots</span></div>
  </section>;
}
