import { ArrowDownRight, ArrowRight, ArrowUpRight, ChartNoAxesCombined, Clock3, Lightbulb, MessageCircle } from 'lucide-react';
import type { Session } from '../hooks/useSimulation';
import { customerInsight, describeChange } from '../lib/experience';
import { systemStatus, resourcePressure } from '../lib/learning';

export function OutcomePanel({ session, inspectorOpen, onInspect, onTutor }: { session: Session; inspectorOpen: boolean; onInspect: () => void; onTutor: () => void }) {
  const { state, pendingChange, outcome, config, running } = session;
  const status = systemStatus(state.metrics);
  return <aside className="outcome-column" aria-label="Customer outcomes">
    <section className="availability-card"><span className="eyebrow">The customer experience</span><h2>Can people get in?</h2><div className={`availability-number ${status.tone}`}>{session.started ? <>{state.metrics.legitAvailabilityPercent.toFixed(1)}<span>%</span></> : '—'}</div><span className="availability-caption">{session.started ? 'of legitimate requests served' : 'No incident measurements yet'}</span><span className={`status-pill ${session.started ? status.tone : 'muted'}`}><i />{session.started ? status.label : 'Not started'}</span><p>{!session.started ? 'Begin the investigation to observe the service and reveal its technical signals.' : state.tick === 0 ? 'Ready for your first experiment. Advance the simulation to measure how the store responds.' : customerInsight(state.metrics)}</p>{state.tick > 0 && resourcePressure(state.metrics) && state.metrics.status === 'normal' && <p className="outcome-warning">Availability is high, but a resource is still under pressure.</p>}<button className={`button button-secondary inspector-trigger ${inspectorOpen ? 'selected' : ''}`} onClick={onInspect} disabled={!session.started} aria-expanded={inspectorOpen} aria-controls="system-inspector"><ChartNoAxesCombined size={15} />{inspectorOpen ? 'Close inspector' : 'Inspect system'}<ArrowUpRight size={14} /></button></section>
    <section className={`effect-card ${pendingChange ? 'pending' : outcome?.kind ?? ''}`} aria-live="polite" aria-label="Measured effect of your changes">
      <span className="eyebrow">After your change</span>
      {pendingChange ? <><span className="effect-icon"><Clock3 size={18} /></span><h3>{describeChange(pendingChange.config, config)}.</h3><p>{running ? 'Measuring on the next simulation tick…' : 'Resume the simulation or press Step to measure the effect.'}</p><span className="measurement-tag">No result claimed yet</span></> : outcome ? <>
        <span className="effect-icon">{outcome.kind === 'improved' ? <ArrowUpRight size={19} /> : outcome.kind === 'worse' ? <ArrowDownRight size={19} /> : <ArrowRight size={19} />}</span><h3>{outcome.title}</h3>
        <div className="before-after"><div><span>Before · {outcome.beforeTick}s</span><strong>{outcome.availabilityDelta === null ? '—' : `${outcome.before.legitAvailabilityPercent.toFixed(1)}%`}</strong></div><ArrowRight size={16} /><div><span>After · {outcome.afterTick}s</span><strong>{outcome.after.legitAvailabilityPercent.toFixed(1)}%</strong></div></div>
        <p>{outcome.explanation}</p><span className="measurement-tag">{outcome.action} · observed at {outcome.afterTick}s</span>
      </> : <><span className="effect-icon"><Lightbulb size={18} /></span><h3>Small changes teach a lot.</h3><p>Adjust the traffic or add a defense. We’ll compare the results after the next tick.</p></>}
    </section>
    <section className="tutor-entry"><MessageCircle size={20} strokeWidth={1.6} /><h3>Make sense of the signals.</h3><p>Your lab companion explains what’s happening, using the current simulation.</p><button onClick={onTutor}>Why is this happening?<ArrowUpRight size={15} /></button><small>Built-in explanations. No external AI.</small></section>
  </aside>;
}
