import { ArrowRight, Check, Clock3, Filter, Lightbulb, Moon, Network, RotateCcw, Server, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Session } from '../hooks/useSimulation';
import { AVAILABILITY_TARGET, resourcePressure, STABLE_TARGET } from '../lib/learning';

export function ChallengePanel({ session, onStart, onHint }: { session: Session; onStart: () => void; onHint: () => void }) {
  if (!session.started) return <section className="incident-brief" aria-label="Incident briefing"><span className="incident-icon"><Moon size={24} strokeWidth={1.5} /></span><div><span className="eyebrow">The incident</span><h2>Something isn’t right at Nova.</h2><p>Nova Store is suddenly becoming unavailable. Customers report failed page loads and unusually slow response times. Your task is to investigate the problem and restore service.</p></div><button className="button button-primary" onClick={onStart}>Investigate incident<ArrowRight size={15} /></button></section>;
  const warning = session.state.metrics.legitAvailabilityPercent >= AVAILABILITY_TARGET && (resourcePressure(session.state.metrics) || session.state.metrics.status !== 'normal');
  return <section className="incident-progress" aria-label="Incident stabilization"><div className="incident-progress-label"><Clock3 size={16} /><div><strong>{session.completedAt !== null ? 'Recovery target reached' : 'Keep the store steady'}</strong><span>At least {AVAILABILITY_TARGET}% availability for {STABLE_TARGET} consecutive seconds.</span></div></div><div className="stability"><div className="stability-track" aria-label={`${session.stableTicks} of ${STABLE_TARGET} consecutive stable ticks`}><span style={{ width: `${session.stableTicks / STABLE_TARGET * 100}%` }} /></div><span><strong>{session.stableTicks}</strong> / {STABLE_TARGET}s</span></div><button className="text-button" onClick={onHint}><Lightbulb size={15} />Get a hint</button>{warning && <p className="incident-warning">Availability meets the target, but resource pressure or degraded service remains.</p>}</section>;
}

export function CompletionSummary({ session, onRetry, onSandbox, onClose }: { session: Session; onRetry: () => void; onSandbox: () => void; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }, []);
  const metrics = session.state.metrics;
  const before = session.incidentMetrics?.legitAvailabilityPercent;
  const pressure = resourcePressure(metrics) || metrics.status !== 'normal';
  return <section className="completion-card" ref={ref} tabIndex={-1} aria-labelledby="completion-title">
    <button className="icon-button completion-close" onClick={onClose} aria-label="Dismiss learning summary"><X size={17} /></button>
    <div className="completion-intro"><span className="completion-icon"><Check size={25} /></span><div><span className="eyebrow">What your investigation changed</span><h2 id="completion-title">{pressure ? 'Recovery target reached.' : 'Service restored.'}</h2><p>The store held its availability target for {STABLE_TARGET} consecutive simulated seconds.</p></div></div>
    <div className="completion-results"><div><span>Legitimate availability</span><strong>{before !== undefined && <><span>{before.toFixed(1)}%</span><ArrowRight size={20} /></>}{metrics.legitAvailabilityPercent.toFixed(1)}%</strong></div><div><span>Investigation duration</span><strong>{session.completedAt}<small> seconds</small></strong></div><div className="completion-defenses"><span>Defenses you tested</span><div>{session.filterUsed && <span><Filter size={13} />Rate limiter</span>}{session.balancerUsed && <span><Network size={13} />Load balancer</span>}<span><Server size={13} />Up to {session.maxServers} server{session.maxServers === 1 ? '' : 's'}</span></div></div></div>
    <p className="completion-learning">At the final tick, {metrics.legitDropped} legitimate requests were dropped. {session.config.filterStrength > 0 ? 'Filtering reduces competing traffic, but can reject legitimate customers too. ' : 'You recovered availability by changing capacity and traffic distribution. '}More queue space can absorb a burst, but it adds waiting time. Availability keeps the focus on the people using your service.</p>
    {pressure && <p className="small-warning">The learning target is met. Resource pressure or degradation remains, so the service is not fully healthy yet.</p>}
    <div className="completion-actions"><button className="button button-secondary" onClick={onRetry}><RotateCcw size={14} />Retry incident</button><button className="button button-primary" onClick={onSandbox}>Return to Sandbox<ArrowRight size={14} /></button></div>
  </section>;
}
