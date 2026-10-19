import { lazy, Suspense, useEffect, useState } from 'react';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bot, Check, ChevronRight, Clock3, FlaskConical, Info, MessageCircle, ShieldCheck, Waves } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar, type ComponentKind } from './components/Sidebar';
import { NetworkCanvas } from './components/NetworkCanvas';
import { ResourceMeters } from './components/ResourceMeters';
import { CyberTutor, TutorCard } from './components/CyberTutor';
import { ChallengePanel, CompletionSummary } from './components/ChallengePanel';
import { Walkthrough } from './components/Walkthrough';
import { useSimulation, type Mode } from './hooks/useSimulation';
import { systemStatus } from './lib/learning';

const TrafficChart = lazy(() => import('./components/TrafficChart').then(module => ({ default: module.TrafficChart })));

export default function App() {
  const { mode, session, updateConfig, toggleRunning, step, reset, applyPreset, switchMode, startChallenge } = useSimulation();
  const { config, state, running } = session;
  const { metrics } = state;
  const [selected, setSelected] = useState<ComponentKind | null>(null);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tour, setTour] = useState<number | 'welcome' | null>('welcome');
  const [notification, setNotification] = useState('');
  const [completionDismissed, setCompletionDismissed] = useState(false);
  const [modelInfo, setModelInfo] = useState(false);
  const locked = !session.started || session.completedAt !== null;
  const status = systemStatus(metrics);
  const pendingChanges = Object.keys(config).some(key => config[key as keyof typeof config] !== session.appliedConfig[key as keyof typeof config]);
  useEffect(() => {
    if (!notification) return;
    const timeout = window.setTimeout(() => setNotification(''), 4200);
    return () => window.clearTimeout(timeout);
  }, [notification]);
  function addComponent(kind: ComponentKind) {
    if (locked) return;
    setSelected(kind);
    if (kind === 'filter') { updateConfig({ filterStrength: config.filterStrength || 0.7 }); setNotification('Rate limiter installed. Changes apply on the next tick.'); }
    if (kind === 'balancer') { updateConfig({ loadBalancer: true }); setNotification('Load balancer installed. Servers will share the next tick’s traffic.'); }
    if (kind === 'server' && config.serverCount < 6) { updateConfig({ serverCount: config.serverCount + 1 }); setNotification(`Server added.${config.loadBalancer ? ' Capacity increases on the next tick.' : ' Enable load balancing to share the workload.'}`); }
  }
  function removeComponent(kind: ComponentKind) {
    if (kind === 'filter') updateConfig({ filterStrength: 0 });
    if (kind === 'balancer') updateConfig({ loadBalancer: false });
    if (kind === 'server') updateConfig({ serverCount: Math.max(1, config.serverCount - 1) });
    setSelected(null);
    setNotification('Infrastructure updated. Changes apply on the next tick.');
  }
  function changeMode(next: Mode) { switchMode(next); setTour(null); setSelected(null); }
  function resetSession() { reset(); setCompletionDismissed(false); setSelected(null); setNotification('Session reset to its initial configuration.'); }
  function openTutor() { setTutorOpen(true); setTour(null); }
  const stats = [
    { label: 'INCOMING TRAFFIC', value: metrics.incoming.toLocaleString(), unit: 'req/s', icon: Waves, detail: state.tick === 0 ? 'No simulation ticks yet' : `${session.appliedConfig.legitRate} legitimate · ${session.appliedConfig.attackType === 'none' ? 0 : session.appliedConfig.attackRate} excess`, className: 'cyan', trend: ArrowUpRight },
    { label: 'LEGITIMATE AVAILABILITY', value: metrics.legitAvailabilityPercent.toFixed(1), unit: '%', icon: ShieldCheck, detail: status.label, className: status.tone, trend: metrics.legitAvailabilityPercent >= 90 ? Check : ArrowDownRight },
    { label: 'RESPONSE LATENCY', value: metrics.latencyMs.toLocaleString(), unit: 'ms', icon: Clock3, detail: metrics.queueDepth ? `${metrics.queueDepth} requests waiting` : 'No requests waiting', className: metrics.latencyMs > 250 ? 'warning' : 'neutral', trend: Activity },
    { label: 'REQUESTS SERVED', value: (metrics.legitServed + metrics.attackServed).toLocaleString(), unit: 'req/s', icon: Activity, detail: `${metrics.blocked} blocked · ${metrics.legitDropped + metrics.attackDropped} dropped`, className: 'neutral', trend: ArrowRight },
  ];
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to dashboard</a>
    <Header mode={mode} metrics={metrics} running={running} locked={locked} onMode={changeMode} onToggle={toggleRunning} onStep={step} onReset={resetSession} onHelp={() => { setTour(0); setTutorOpen(false); }} />
    <div className="app-body">
      <Sidebar config={config} mode={mode} disabled={locked} selected={selected} onConfig={updateConfig} onPreset={applyPreset} onAdd={addComponent} onSelect={setSelected} />
      <main className="workspace" id="main" tabIndex={-1}>
        <div className="workspace-intro"><div><div className="breadcrumb"><FlaskConical size={12} /> WORKSPACE <ChevronRight size={11} /><span>{mode === 'sandbox' ? 'SANDBOX' : 'CHALLENGES'}</span></div><h1>{mode === 'sandbox' ? 'Your network. Your rules.' : 'Investigate. Adapt. Restore.'}</h1><p>{mode === 'sandbox' ? 'Experiment with traffic. Build your defenses. Understand what happens.' : 'A real learning challenge, in a completely simulated environment.'}</p></div><div className="environment-label"><span className="environment-icon"><FlaskConical size={18} /></span><div><strong>Safe by design</strong><span>100% educational simulation</span></div></div></div>
        <div className="session-strip"><span><i className={`status-dot ${running ? 'healthy' : 'muted'}`} />{running ? 'Simulation running' : session.started ? 'Ready to experiment' : 'Awaiting investigation'}<span className="strip-separator">/</span> {String(state.tick).padStart(3, '0')} simulated seconds</span><button onClick={() => setModelInfo(!modelInfo)} aria-expanded={modelInfo}><Info size={13} /> Simulation model <span className="mock-version">LOCAL</span></button></div>
        <a className="mobile-config-link" href="#configuration">Configure traffic & defenses <ArrowDownRight size={13} /></a>
        {modelInfo && <div className="model-info"><Info size={17} /><p>All metrics come from the local CyberLab simulation engine. Volume traffic competes for processing; SYN traffic occupies half-open connections and reduces queue room. Bandwidth is measured in requests per second and reports utilization; it does not cap processing in this educational model. Tick zero is an empty, unstarted state. No traffic leaves your browser.</p><button className="text-button" onClick={() => setModelInfo(false)}>Close</button></div>}
        {pendingChanges && <div className="pending-notice" role="status"><Clock3 size={13} />Configuration updated. {running ? 'Metrics refresh on the next tick.' : 'Press Step or Run to see the effect. Metrics show the last tick.'}</div>}
        {mode === 'challenge' && <ChallengePanel session={session} onStart={startChallenge} onHint={openTutor} />}
        <section className="stats-grid" aria-label="Current simulation metrics">{stats.map(({ label, value, unit, icon: Icon, detail, className, trend: Trend }) => <article className={`stat-card ${className}`} key={label}><div className="stat-label"><span>{label}</span><Icon size={16} /></div><div className="stat-value">{value}<small>{unit}</small></div><div className="stat-detail"><Trend size={12} /><span>{detail}</span></div></article>)}</section>
        <div className="dashboard-grid">
          <NetworkCanvas config={config} appliedConfig={session.appliedConfig} metrics={metrics} halfOpen={state.halfOpen} tick={state.tick} running={running} disabled={locked} selected={selected} onSelect={setSelected} onAdd={addComponent} onRemove={removeComponent} />
          <ResourceMeters metrics={metrics} />
          <Suspense fallback={<section className="panel chart-loading" role="status">Loading traffic analytics…</section>}><TrafficChart state={state} /></Suspense>
          <TutorCard metrics={metrics} challenge={mode === 'challenge'} onOpen={openTutor} />
        </div>
        <footer className="workspace-footer"><span><ShieldCheck size={13} /> No real traffic. No external targets. Just understanding.</span><button onClick={openTutor}><Bot size={14} /> A question is a good place to start.</button></footer>
      </main>
    </div>
    {notification && <div className="toast" role="status"><Check size={16} />{notification}</div>}
    <button className="tutor-launcher" aria-label={tutorOpen ? 'Close Cyber Tutor' : 'Open Cyber Tutor'} onClick={() => tutorOpen ? setTutorOpen(false) : openTutor()}><MessageCircle size={20} /><span>Cyber Tutor</span><span className="launcher-dot" /></button>
    <CyberTutor open={tutorOpen} onClose={() => setTutorOpen(false)} config={session.appliedConfig} metrics={metrics} tick={state.tick} mode={mode} />
    <Walkthrough step={tour} onStep={setTour} onClose={() => setTour(null)} />
    {mode === 'challenge' && session.completedAt !== null && !completionDismissed && <CompletionSummary session={session} onRetry={resetSession} onSandbox={() => { changeMode('sandbox'); }} onClose={() => setCompletionDismissed(true)} />}
  </div>;
}
