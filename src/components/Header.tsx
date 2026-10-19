import { CircleHelp, FlaskConical, Pause, Play, RotateCcw, ShieldCheck, SkipForward, Trophy } from 'lucide-react';
import type { Mode } from '../hooks/useSimulation';
import type { SimulationMetrics } from '../shared/simulationTypes';
import { systemStatus } from '../lib/learning';

interface Props {
  mode: Mode; metrics: SimulationMetrics; running: boolean; locked: boolean;
  onMode: (mode: Mode) => void; onToggle: () => void; onStep: () => void;
  onReset: () => void; onHelp: () => void;
}

export function Header({ mode, metrics, running, locked, onMode, onToggle, onStep, onReset, onHelp }: Props) {
  const status = systemStatus(metrics);
  return <header className="app-header">
    <a className="brand" href="#main" aria-label="CyberLab dashboard"><span className="brand-mark"><ShieldCheck size={25} strokeWidth={1.7} /></span><span>Cyber<span className="text-cyan">Lab</span><small>NETWORK LEARNING LAB</small></span></a>
    <nav className="mode-tabs" aria-label="Lab mode">
      <button className={mode === 'sandbox' ? 'active' : ''} aria-current={mode === 'sandbox' ? 'page' : undefined} onClick={() => onMode('sandbox')}><FlaskConical size={16} /> Sandbox</button>
      <button className={mode === 'challenge' ? 'active' : ''} aria-current={mode === 'challenge' ? 'page' : undefined} onClick={() => onMode('challenge')}><Trophy size={16} /> Challenges</button>
    </nav>
    <div className="header-actions">
      <span className={`status-pill ${status.tone}`}><i />{status.label}</span>
      <button className="icon-button help-button" onClick={onHelp} aria-label="Open walkthrough" title="Show me around"><CircleHelp size={19} /></button>
      <span className="header-divider" />
      <button className="icon-button" onClick={onReset} aria-label="Reset simulation" title="Reset current session"><RotateCcw size={17} /></button>
      <button className="button button-secondary step-button" onClick={onStep} disabled={running || locked} title={running ? 'Pause before stepping' : 'Advance one simulated second'}><SkipForward size={15} /> Step</button>
      <button className={`button ${running ? 'button-secondary' : 'button-primary'}`} onClick={onToggle} disabled={locked}>{running ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}{running ? 'Pause' : 'Run simulation'}</button>
    </div>
  </header>;
}
