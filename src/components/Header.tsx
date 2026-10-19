import { CircleHelp, FlaskConical, MessageCircle, Moon, Sun, Pause, Play, RotateCcw, ShieldCheck, SkipForward } from 'lucide-react';
import { useState } from 'react';
import type { SimulationMetrics } from '../shared/simulationTypes';
import { systemStatus } from '../lib/learning';

export type Section = 'workspace' | 'challenges' | 'analytics' | 'learn';
interface Props { section: Section; metrics: SimulationMetrics; started: boolean; onNavigate: (section: Section) => void; onHelp: () => void; onTutor: () => void }

export function Header({ section, metrics, started, onNavigate, onHelp, onTutor }: Props) {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next ? '#161616' : '#ffffff');
    try { localStorage.setItem('cyberlab-theme', next ? 'dark' : 'light'); } catch { /* Private browsing can disable storage. */ }
  }
  const status = systemStatus(metrics);
  return <div className="header-wrap"><header className="app-header">
    <a className="brand" href="#main" aria-label="CyberLab workspace"><span className="brand-mark"><FlaskConical size={22} strokeWidth={1.8} /></span><span>CyberLab<span className="brand-dot">.</span></span></a>
    <nav className="mode-tabs" aria-label="Primary navigation">{(['workspace','challenges','analytics','learn'] as const).map(item=><button key={item} className={section === item ? 'active' : ''} aria-current={section === item ? 'page' : undefined} onClick={()=>onNavigate(item)}>{item[0].toUpperCase()+item.slice(1)}</button>)}</nav>
    <div className="header-actions"><span className={`status-pill ${started ? status.tone : 'muted'}`}><i />{started ? status.label : 'Awaiting investigation'}</span><button className="help-button" onClick={onTutor}><MessageCircle size={17}/><span>Cyber Tutor</span></button><button className="theme-toggle icon-button" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={dark} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button><button className="help-button" onClick={onHelp} aria-label="Open walkthrough"><CircleHelp size={17} /><span>Help</span></button></div>
  </header></div>;
}

export function SimulationControls({ running, locked, tick, onToggle, onStep, onReset }: {
  running: boolean; locked: boolean; tick: number; onToggle: () => void; onStep: () => void; onReset: () => void;
}) {
  return <div className="simulation-controls" aria-label="Simulation controls">
    <span className="simulation-time"><ShieldCheck size={13} />{tick}s <span>simulated</span></span>
    <button className="icon-button" onClick={onReset} aria-label="Reset simulation" title="Reset this experiment"><RotateCcw size={17} /></button>
    <button className="button button-secondary" onClick={onStep} disabled={running || locked} title={running ? 'Pause before stepping' : 'Advance one simulated second'}><SkipForward size={14} />Step</button>
    <button className="button button-primary" onClick={onToggle} disabled={locked}>{running ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}{running ? 'Pause' : 'Run simulation'}</button>
  </div>;
}
