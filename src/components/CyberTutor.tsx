import { ArrowRight, Bot, ChevronRight, Lightbulb, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SimulationConfig, SimulationMetrics } from '../shared/simulationTypes';
import { explain, resourcePressure, suggestedQuestions } from '../lib/learning';
import type { Mode } from '../hooks/useSimulation';

export function TutorCard({ metrics, challenge, onOpen }: { metrics: SimulationMetrics; challenge: boolean; onOpen: () => void }) {
  return <section className="panel tutor-card">
    <div className="tutor-card-top"><span className="tutor-avatar"><Bot size={24} /></span><span className="tiny-tag">YOUR LAB COMPANION</span><Sparkles size={16} className="text-cyan" /></div>
    <h2>A little curiosity.<br /><span className="text-cyan">A lot of understanding.</span></h2>
    <p>{challenge ? 'Investigate the incident with progressive hints. Start with what the metrics tell you.' : resourcePressure(metrics) ? 'Something is putting your network under pressure. Let’s look at the evidence together.' : 'Not sure what a metric means? Explore the why behind what’s happening in your network.'}</p>
    <button className="tutor-suggestion" onClick={onOpen}><Lightbulb size={15} /><span>{challenge ? 'Where should I start investigating?' : 'What should I experiment with first?'}</span><ChevronRight size={14} /></button>
    <button className="button button-tutor" onClick={onOpen}><MessageCircle size={16} /> Ask Cyber Tutor<ArrowRight size={15} /></button>
    <span className="tutor-disclaimer">Context-aware guide · No external AI</span>
  </section>;
}

interface Message { id: number; role: 'user' | 'tutor'; text: string; tick: number }
interface Props { open: boolean; onClose: () => void; config: SimulationConfig; metrics: SimulationMetrics; tick: number; mode: Mode }

export function CyberTutor({ open, onClose, config, metrics, tick, mode }: Props) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Record<Mode, Message[]>>({ sandbox: [], challenge: [] });
  const [hintLevel, setHintLevel] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentMessages = messages[mode];
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { if (open && currentMessages.length) endRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }); }, [currentMessages.length, open]);
  useEffect(() => { setQuestion(''); }, [mode]);
  if (!open) return null;
  function ask(value: string) {
    const text = value.trim();
    if (!text) return;
    const answer = explain(text, config, metrics, mode === 'challenge', hintLevel);
    if (mode === 'challenge' && /hint|help|solution|solve/i.test(text)) setHintLevel(level => level + 1);
    setMessages(previous => ({ ...previous, [mode]: [...previous[mode], { id: previous[mode].length, role: 'user', text, tick }, { id: previous[mode].length + 1, role: 'tutor', text: answer, tick }] }));
    setQuestion('');
    inputRef.current?.focus();
  }
  return <aside className="tutor-drawer" aria-label="Cyber Tutor" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
    <div className="tutor-drawer-heading"><span className="tutor-avatar"><MessageCircle size={23} /></span><div><h2>Cyber Tutor</h2><span>Context from your {mode}</span></div><button className="icon-button" onClick={onClose} aria-label="Close Cyber Tutor"><X size={19} /></button></div>
    <div className="tutor-context"><span>Your current signals</span><b>{metrics.legitAvailabilityPercent.toFixed(1)}% availability</b><span>{tick}s</span></div>
    <div className="tutor-conversation">
      <div className="tutor-welcome"><h3>Why is this happening?</h3><p>Let’s look at the evidence together. These built-in explanations use your actual simulation, at the moment you ask.</p></div>
      <div className="question-chips">{(mode === 'challenge' ? ['Give me a hint', 'Why is my website slow?', 'What does the request queue mean?'] : suggestedQuestions).map(text => <button key={text} onClick={() => ask(text)}>{text}<ArrowRight size={12} /></button>)}</div>
      <div className="messages" aria-live="polite" aria-relevant="additions">{currentMessages.map(message => <div key={message.id} className={`message ${message.role}`}><span>{message.role === 'tutor' ? 'Cyber Tutor' : 'You'} <small>· {message.tick}s</small></span><p>{message.text}</p></div>)}</div>
      <div ref={endRef} />
    </div>
    <form className="tutor-form" onSubmit={event => { event.preventDefault(); ask(question); }}><label className="sr-only" htmlFor="tutor-question">Ask Cyber Tutor</label><input ref={inputRef} id="tutor-question" placeholder="Ask about your network…" value={question} maxLength={400} onChange={event => setQuestion(event.target.value)} /><button type="submit" disabled={!question.trim()} aria-label="Send question"><Send size={17} /></button></form>
    <p className="drawer-disclaimer">Educational explanations. No API calls or external AI.</p>
  </aside>;
}
