import { useState } from 'react';
import { ArrowDown, ArrowUpRight, CircleHelp, ShieldCheck } from 'lucide-react';
import { Header, SimulationControls } from './components/Header';
import { Sidebar, type ComponentKind } from './components/Sidebar';
import { NetworkCanvas } from './components/NetworkCanvas';
import { NovaStore } from './components/NovaStore';
import { OutcomePanel } from './components/OutcomePanel';
import { Inspector } from './components/Inspector';
import { CyberTutor } from './components/CyberTutor';
import { ChallengePanel, CompletionSummary } from './components/ChallengePanel';
import { Walkthrough } from './components/Walkthrough';
import { useSimulation, type Mode } from './hooks/useSimulation';
import type { SimulationConfig } from './shared/simulationTypes';

export default function App() {
  const { mode, session, updateConfig, toggleRunning, step, reset, applyPreset, switchMode, startChallenge } = useSimulation();
  const { config, state, running } = session;
  const [selected, setSelected] = useState<ComponentKind | null>(null);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [tour, setTour] = useState<number | 'welcome' | null>(null);
  const [completionDismissed, setCompletionDismissed] = useState(false);
  const locked = !session.started || session.completedAt !== null;

  function changeConfig(patch: Partial<SimulationConfig>) {
    if ('filterStrength' in patch) setSelected('filter');
    else if ('loadBalancer' in patch) setSelected('balancer');
    else if (Object.keys(patch).some(key => key.startsWith('perServer') || key === 'serverCount')) setSelected('server');
    updateConfig(patch);
  }
  function addComponent(kind: ComponentKind) {
    if (locked) return;
    setSelected(kind);
    if (kind === 'filter') updateConfig({ filterStrength: config.filterStrength || 0.7 });
    if (kind === 'balancer') updateConfig({ loadBalancer: true });
    if (kind === 'server' && config.serverCount < 6) updateConfig({ serverCount: config.serverCount + 1 });
  }
  function removeComponent(kind: ComponentKind) {
    if (kind === 'filter') updateConfig({ filterStrength: 0 });
    if (kind === 'balancer') updateConfig({ loadBalancer: false });
    if (kind === 'server') updateConfig({ serverCount: Math.max(1, config.serverCount - 1) });
    setSelected(kind);
  }
  function changeMode(next: Mode) {
    switchMode(next); setTour(null); setSelected(null); setInspectorOpen(false); setTutorOpen(false);
  }
  function resetSession() {
    reset(); setCompletionDismissed(false); setSelected(null);
  }
  function closeInspector() {
    setInspectorOpen(false);
    document.querySelector<HTMLButtonElement>('.inspector-trigger')?.focus();
  }
  function openTutor() { setTutorOpen(true); setTour(null); }
  function tourStep(index: number) { if (index === 3) setInspectorOpen(true); setTour(index); }

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to workspace</a>
    <Header mode={mode} metrics={state.metrics} running={running} locked={locked} started={session.started} onMode={changeMode} onToggle={toggleRunning} onStep={step} onReset={resetSession} onHelp={() => { setTour(0); setTutorOpen(false); }} />
    <div className="app-body">
      <Sidebar config={config} mode={mode} disabled={locked} selected={selected} onConfig={changeConfig} onPreset={applyPreset} onAdd={addComponent} onSelect={setSelected} />
      <main className="workspace" id="main" tabIndex={-1}>
        <div className="workspace-toolbar"><span className="workspace-label"><span className={`activity-dot ${running ? 'running' : ''}`} />{mode === 'sandbox' ? 'A live experiment' : 'An incident investigation'}<span> / Nova Store</span></span><SimulationControls running={running} locked={locked} tick={state.tick} onToggle={toggleRunning} onStep={step} onReset={resetSession} /></div>
        <div className="workspace-intro"><div><h1>{mode === 'sandbox' ? 'Your store. Your experiment.' : 'The Midnight Outage.'}</h1><p>{mode === 'sandbox' ? 'What happens when your website receives more traffic than it can handle?' : 'An unexplained outage. Real consequences for fictional customers.'}</p></div><button className="intro-help" onClick={() => { setTour(0); setTutorOpen(false); }}><CircleHelp size={16} />New here?<ArrowUpRight size={13} /></button></div>
        <a className="mobile-config-link" href="#configuration">Traffic & tools<ArrowDown size={14} /></a>
        {mode === 'challenge' && <ChallengePanel session={session} onStart={startChallenge} onHint={openTutor} />}
        {mode === 'challenge' && session.completedAt !== null && !completionDismissed && <CompletionSummary session={session} onRetry={resetSession} onSandbox={() => changeMode('sandbox')} onClose={() => setCompletionDismissed(true)} />}
        <div className="lab-grid"><div className="experiment-column">
          <div className="section-title"><div><span className="section-number">01</span><h2>See what your customers see</h2></div><span className="subtle-label">Live service preview</span></div>
          <NovaStore key={mode} state={state} awaitingIncident={mode === 'challenge' && !session.started} />
          <div className="section-title network-section-title"><div><span className="section-number">02</span><h2>Make a change behind the scenes</h2></div><span className="subtle-label">Drag. Drop. Observe.</span></div>
          {session.started ? <NetworkCanvas config={config} appliedConfig={session.appliedConfig} metrics={state.metrics} halfOpen={state.halfOpen} tick={state.tick} running={running} disabled={locked} selected={selected} onSelect={setSelected} onAdd={addComponent} onRemove={removeComponent} /> : <section className="network-standby" data-tour="network"><ShieldCheck size={24} strokeWidth={1.5} /><h3>Follow the evidence.</h3><p>Your network becomes available when you begin the investigation.</p></section>}
          {session.pendingChange && <p className="network-pending" role="status">Settings changed. {running ? 'Measuring on the next tick.' : 'Run or Step to see the network respond.'}</p>}
        </div><OutcomePanel session={session} inspectorOpen={inspectorOpen} onInspect={() => inspectorOpen ? closeInspector() : setInspectorOpen(true)} onTutor={openTutor} /></div>
        {inspectorOpen && <Inspector config={config} state={state} mode={mode} disabled={locked} onConfig={changeConfig} onPreset={applyPreset} onClose={closeInspector} />}
        <footer className="workspace-footer"><span><ShieldCheck size={13} />Built for curiosity. Entirely simulated.</span><span>Every result comes from your local simulation.</span></footer>
      </main>
    </div>
    <CyberTutor open={tutorOpen} onClose={() => { setTutorOpen(false); document.querySelector<HTMLButtonElement>('.tutor-entry button')?.focus(); }} config={session.appliedConfig} metrics={state.metrics} tick={state.tick} mode={mode} />
    <Walkthrough step={tour} onStep={tourStep} onClose={() => setTour(null)} />
  </div>;
}
