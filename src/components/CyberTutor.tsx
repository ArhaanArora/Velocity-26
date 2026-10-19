import { ArrowRight, Bot, ChevronRight, Lightbulb, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SimulationConfig, SimulationMetrics } from '../shared/simulationTypes';
import { explain, resourcePressure, suggestedQuestions } from '../lib/learning';
import type { Mode } from '../hooks/useSimulation';
import { requestTutorAnswer, type TutorSource } from '../adapters/tutorApi';

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

interface Message { id: number; role: 'user' | 'tutor'; text: string; tick: number; provider?: 'gemini' | 'offline'; sources?: TutorSource[]; error?: string }
interface Props { open: boolean; onClose: () => void; config: SimulationConfig; metrics: SimulationMetrics; tick: number; mode: Mode }

export function CyberTutor({ open, onClose, config, metrics, tick, mode }: Props) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Record<Mode, Message[]>>({ sandbox: [], challenge: [] });
  const [hintLevel, setHintLevel] = useState(0);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const messageId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentMessages = messages[mode];
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { if (open && currentMessages.length) endRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }); }, [currentMessages.length, open]);
  useEffect(() => { setQuestion(''); requestRef.current?.abort(); setLoading(false); }, [mode]);
  useEffect(() => () => { requestRef.current?.abort(); }, []);
  useEffect(() => { if (!open) { requestRef.current?.abort(); setLoading(false); } }, [open]);
  if (!open) return null;
  async function ask(value: string) {
    const text = value.trim();
    if (!text || text.length > 1000 || requestRef.current) return;
    const capturedMode = mode;
    const fallback = tick === 0 ? 'No simulation tick has been measured yet. Run or Step to collect the first observations. ' + explain(text, config, metrics, mode === 'challenge', hintLevel) : explain(text, config, metrics, mode === 'challenge', hintLevel);
    if (mode === 'challenge' && /hint|help|solution|solve/i.test(text)) setHintLevel(level => level + 1);
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    const userId = ++messageId.current;
    setMessages(previous => ({ ...previous, [capturedMode]: [...previous[capturedMode], {id:userId,role:'user',text,tick}].slice(-40) as Message[] }));
    setQuestion('');
    const timer = window.setTimeout(() => controller.abort('timeout'), 18000);
    try {
      const result = await requestTutorAnswer({question:text,messages:currentMessages.slice(-12).map(message=>({role:message.role === 'user' ? 'user' : 'assistant',text:message.text})),config:{...config},metrics:{...metrics},tick,mode:capturedMode,hintLevel:Math.min(hintLevel,1000)},controller.signal);
      if (controller.signal.aborted) return;
      const id = ++messageId.current;
      setMessages(previous => ({...previous,[capturedMode]:[...previous[capturedMode],{id,role:'tutor',text:result.answer,tick,provider:'gemini',sources:result.sources}].slice(-40) as Message[]}));
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== 'timeout') return;
      const id = ++messageId.current;
      const message = controller.signal.reason === 'timeout' ? 'The AI tutor timed out.' : error instanceof Error ? error.message : 'The AI tutor is unavailable.';
      setMessages(previous => ({...previous,[capturedMode]:[...previous[capturedMode],{id,role:'tutor',text:fallback,tick,provider:'offline',error:message}].slice(-40) as Message[]}));
    } finally {
      window.clearTimeout(timer);
      if (requestRef.current === controller) { requestRef.current = null; setLoading(false); }
      inputRef.current?.focus();
    }
  }
  return <aside className="tutor-drawer" aria-label="Cyber Tutor" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
    <div className="tutor-drawer-heading"><span className="tutor-avatar"><MessageCircle size={23} /></span><div><h2>Cyber Tutor</h2><span>Context from your {mode}</span></div><button className="icon-button" onClick={onClose} aria-label="Close Cyber Tutor"><X size={19} /></button></div>
    <div className="tutor-context"><span>Your current signals</span><b>{metrics.legitAvailabilityPercent.toFixed(1)}% availability</b><span>{tick}s</span></div>
    <div className="tutor-conversation">
      <div className="tutor-welcome"><h3>Why is this happening?</h3><p>Ask about cybersecurity or your current experiment. Gemini uses local learning material and a snapshot of your simulation when the API is available. Otherwise, a clearly labeled offline guide helps.</p></div>
      <div className="question-chips">{(mode === 'challenge' ? ['Give me a hint', 'Why is my website slow?', 'What does the request queue mean?'] : suggestedQuestions).map(text => <button key={text} disabled={loading} onClick={() => { void ask(text); }}>{text}<ArrowRight size={12} /></button>)}</div>
      <div className="messages" aria-live="polite" aria-relevant="additions" aria-busy={loading}>{currentMessages.map(message => <div key={message.id} className={`message ${message.role}`}><span>{message.role === 'tutor' ? message.provider === 'gemini' ? 'Gemini · AI tutor' : 'Offline guide' : 'You'} <small>· {message.tick}s</small></span>{message.error && <div className="tutor-api-notice">{message.error} Using offline explanations.</div>}<p>{message.text}</p>{!!message.sources?.length && <details className="tutor-sources"><summary>Learning sources</summary><ul>{message.sources.map(source=><li key={source.id}>[{source.id}] {source.title}</li>)}</ul></details>}</div>)}{loading && <p className="tutor-loading" role="status"><span className="loading-ring" />Thinking with your simulation snapshot…</p>}</div>
      <div ref={endRef} />
    </div>
    <form className="tutor-form" onSubmit={event => { event.preventDefault(); void ask(question); }}><label className="sr-only" htmlFor="tutor-question">Ask Cyber Tutor</label><input ref={inputRef} id="tutor-question" placeholder="Ask about your network…" value={question} maxLength={1000} onChange={event => setQuestion(event.target.value)} /><button type="submit" disabled={loading || !question.trim()} aria-label="Send question"><Send size={17} /></button></form>
    <p className="drawer-disclaimer">AI can make mistakes. Replies use the tick shown; offline replies are labeled.</p>
  </aside>;
}
