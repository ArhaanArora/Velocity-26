import { useState } from 'react';
import { MessageCircle, ShieldCheck } from 'lucide-react';
import { Header, SimulationControls, type Section } from './components/Header';
import { Sidebar, type ComponentKind } from './components/Sidebar';
import { NetworkCanvas } from './components/NetworkCanvas';
import { NovaStore } from './components/NovaStore';
import { OutcomePanel } from './components/OutcomePanel';
import { AnalyticsPage, LearnPage } from './components/ReferencePages';
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
  const [section, setSection] = useState<Section>('workspace');
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
    switchMode(next); setTour(null); setSelected(null); setSection('workspace'); setTutorOpen(false);
  }
  function resetSession() {
    reset(); setCompletionDismissed(false); setSelected(null);
  }
  function openTutor() { setTutorOpen(true); setTour(null); }
  function navigate(next: Section) { setSection(next); setTour(null); if (next === 'challenges') switchMode('challenge'); }
  function tourStep(index: number) { setSection(index === 3 ? 'analytics' : 'workspace'); setTour(index); }
  function beginIncident() { startChallenge(); setSection('workspace'); }

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to workspace</a>
    <Header section={section} metrics={state.metrics} started={session.started} onNavigate={navigate} onTutor={openTutor} onHelp={() => { setSection('workspace'); setTour(0); setTutorOpen(false); }} />
    <main className="desktop-main" id="main" tabIndex={-1}>
      <div className="desktop-toolbar"><div><h1>{section === 'workspace' ? mode === 'sandbox' ? 'Workspace' : 'Midnight Outage' : section[0].toUpperCase()+section.slice(1)}</h1><span>{mode === 'sandbox' ? 'Sandbox / Nova Store' : 'Challenge / Nova Store'}</span>{mode==='challenge' && <button className="text-button" onClick={()=>changeMode('sandbox')}>Return to Sandbox</button>}</div><SimulationControls running={running} locked={locked} tick={state.tick} onToggle={toggleRunning} onStep={step} onReset={resetSession}/></div>
      {section === 'workspace' && <div className="desktop-workspace">
        <Sidebar config={config} mode={mode} disabled={locked} selected={selected} onConfig={changeConfig} onPreset={applyPreset} onAdd={addComponent} onSelect={setSelected}/>
        <section className="network-workspace" aria-label="Infrastructure workspace">
          {mode === 'challenge' && <ChallengePanel session={session} onStart={beginIncident} onHint={openTutor}/>}
          {session.started ? <NetworkCanvas onConfig={changeConfig} trafficLocked={mode === 'challenge'} config={config} appliedConfig={session.appliedConfig} metrics={state.metrics} halfOpen={state.halfOpen} tick={state.tick} running={running} disabled={locked} selected={selected} onSelect={setSelected} onAdd={addComponent} onRemove={removeComponent}/> : <div className="network-standby" data-tour="network"><ShieldCheck size={28}/><h3>Follow the evidence.</h3><p>Start the incident to reveal your network.</p></div>}
          <OutcomePanel session={session} inspectorOpen={false} onInspect={()=>setSection('analytics')} onTutor={openTutor}/>
          <button className="button button-secondary analytics-shortcut" onClick={()=>setSection('analytics')}>Inspect system / Analytics</button>
          {mode === 'challenge' && session.completedAt !== null && !completionDismissed && <div className="workspace-completion"><CompletionSummary session={session} onRetry={resetSession} onSandbox={()=>changeMode('sandbox')} onClose={()=>setCompletionDismissed(true)}/></div>}
        </section>
        <section className="live-store-column" aria-label="Live customer experience"><div className="live-store-status"><div><span>Website availability</span><strong>{session.started ? `${state.metrics.legitAvailabilityPercent.toFixed(1)}%` : 'Not started'}</strong></div><span>{session.started ? state.tick === 0 ? 'Ready for first tick' : state.metrics.status === 'normal' ? 'Service operational' : state.metrics.status === 'down' ? 'Service unavailable' : 'Service degraded' : 'Awaiting investigation'}</span></div><NovaStore key={mode} state={state} awaitingIncident={mode==='challenge' && !session.started}/></section>
      </div>}
      {section === 'challenges' && <section className="reference-page challenges-page"><div className="page-heading"><h1>The Midnight Outage.</h1><p>What problem should you solve? Investigate failed page loads and restore Nova Store.</p></div><ChallengePanel session={session} onStart={beginIncident} onHint={openTutor}/>{session.started && <div className="challenge-actions"><button className="button button-primary" onClick={()=>setSection('workspace')}>Open incident workspace</button><button className="button button-secondary" onClick={resetSession}>Retry incident</button></div>}{session.completedAt !== null && <CompletionSummary session={session} onRetry={resetSession} onSandbox={()=>changeMode('sandbox')} onClose={()=>setSection('workspace')}/>}<div className="challenge-objective"><h2>Your objective</h2><p>Keep legitimate availability at or above 85% for 15 consecutive simulated seconds. Use the network and Analytics to discover the cause. Changing sections preserves your experiment.</p></div></section>}
      {section === 'analytics' && <AnalyticsPage state={state}/>}
      {section === 'learn' && <LearnPage onExplore={component=>{setSelected(component??null);setSection('workspace');}}/>}
    </main>
    <button className="floating-tutor" onClick={openTutor} aria-label="Open Cyber Tutor"><MessageCircle size={20}/><span>Cyber Tutor</span></button>
    <CyberTutor open={tutorOpen} onClose={() => { setTutorOpen(false); document.querySelector<HTMLButtonElement>('.floating-tutor')?.focus(); }} config={session.appliedConfig} metrics={state.metrics} tick={state.tick} mode={mode} />
    <Walkthrough step={tour} onStep={tourStep} onClose={() => setTour(null)} />
  </div>;
}
