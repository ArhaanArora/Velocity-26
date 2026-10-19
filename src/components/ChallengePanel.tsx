import { AlertTriangle, ArrowRight, Check, Clock3, Filter, Lightbulb, Moon, Network, RotateCcw, ShieldCheck, Trophy } from 'lucide-react';
import type { Session } from '../hooks/useSimulation';
import { AVAILABILITY_TARGET, resourcePressure, STABLE_TARGET, systemStatus } from '../lib/learning';
import { useDialogFocus } from '../hooks/useDialogFocus';

export function ChallengePanel({ session, onStart, onHint }: { session: Session; onStart: () => void; onHint: () => void }) {
  return <section className="challenge-panel" aria-label="The Midnight Outage challenge">
    <span className="challenge-icon"><Moon size={22} /></span><div className="challenge-copy"><span className="section-eyebrow">INCIDENT 001 · THE MIDNIGHT OUTAGE</span><h2>{session.started ? 'The service is counting on you.' : 'It’s midnight. Your service is failing.'}</h2><p>{session.started ? 'Investigate the signals, test your defenses, and restore availability.' : 'Legitimate users are reporting failures. Find the bottleneck and restore at least 85% availability for 15 consecutive simulated seconds.'}</p></div>
    {session.started ? <div className="stability"><div><span><Clock3 size={13} /> Stabilization</span><strong>{session.stableTicks} <small>/ {STABLE_TARGET}s</small></strong></div><div className="stability-segments" aria-label={`${session.stableTicks} of ${STABLE_TARGET} consecutive stable ticks`}>{Array.from({ length: STABLE_TARGET }, (_, index) => <i key={index} className={index < session.stableTicks ? 'filled' : ''} />)}</div><span>Keep availability ≥ {AVAILABILITY_TARGET}%</span></div> : <button className="button button-primary" onClick={onStart}>Begin investigation<ArrowRight size={15} /></button>}
    {session.started && <button className="button button-secondary hint-button" onClick={onHint}><Lightbulb size={15} /> Get a hint</button>}
    {session.started && session.state.metrics.availabilityPct >= AVAILABILITY_TARGET && (resourcePressure(session.state.metrics) || systemStatus(session.state.metrics).tone !== 'healthy') && <div className="challenge-warning"><AlertTriangle size={13} /> Availability meets the target, but resource pressure or degraded service remains.</div>}
  </section>;
}

export function CompletionSummary({ session, onRetry, onSandbox, onClose }: { session: Session; onRetry: () => void; onSandbox: () => void; onClose: () => void }) {
  const dialogRef = useDialogFocus();
  const { metrics } = session.state;
  const pressure = resourcePressure(metrics) || systemStatus(metrics).tone !== 'healthy';
  return <div className="modal-backdrop"><section ref={dialogRef} className="completion modal-card" role="dialog" aria-modal="true" aria-labelledby="completion-title" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
    <span className="completion-icon"><Trophy size={32} /></span><span className="section-eyebrow">INCIDENT RESOLVED · LEARNING UNLOCKED</span><h2 id="completion-title">You brought availability back.</h2><p>Legitimate users reached the stabilization target for {STABLE_TARGET} consecutive simulated seconds.</p>
    <div className="completion-stats"><div><strong>{metrics.availabilityPct.toFixed(1)}<small>%</small></strong><span>Final availability</span></div><div><strong>{session.completedAt}<small>s</small></strong><span>Incident duration</span></div><div><strong>{STABLE_TARGET}<small>s</small></strong><span>Sustained recovery</span></div></div>
    <div className="completion-defenses"><span className="section-eyebrow">DEFENSES TESTED DURING THE INCIDENT</span><div>{session.filterUsed && <span><Filter size={14} /> Rate limiter</span>}{session.balancerUsed && <span><Network size={14} /> Load balancer</span>}<span><ShieldCheck size={14} /> Up to {session.maxServers} server{session.maxServers > 1 ? 's' : ''}</span></div></div>
    <div className="learning-note"><Check size={17} /><p>{session.config.rateLimitEnabled ? `Filtering reduced competing demand, with a trade-off: at the final setting it can also block about ${Math.round(session.config.filterStrength * 10)}% of legitimate arrivals. ` : 'You restored availability through capacity and traffic distribution. '}A deeper queue can absorb bursts, but adds waiting time. Availability is the measure that keeps the focus on real users.</p></div>
    {pressure && <p className="small-warning"><AlertTriangle size={15} /> The learning target is met, but the service still shows pressure or degradation. This is not a guarantee of full health.</p>}
    <div className="modal-actions"><button autoFocus className="button button-secondary" onClick={onRetry}><RotateCcw size={15} /> Retry challenge</button><button className="button button-primary" onClick={onSandbox}>Return to Sandbox<ArrowRight size={15} /></button></div><button className="text-button" onClick={onClose}>Inspect final metrics</button>
  </section></div>;
}
