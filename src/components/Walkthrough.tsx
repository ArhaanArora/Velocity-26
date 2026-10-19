import { ArrowLeft, ArrowRight, Compass, Network, X } from 'lucide-react';
import { useEffect } from 'react';

export const tourSteps = [
  { target: 'network', title: 'Meet your network.', text: 'Follow the paths from traffic sources through your defenses to the server pool. Green is legitimate traffic, red is simulated excess. The flow pauses when the simulation pauses.' },
  { target: 'traffic', title: 'Turn up the traffic.', text: 'Increase surge traffic to create a volume overload. Slider changes affect the next tick. Run advances one second at a time; Step lets you inspect a single second.' },
  { target: 'defenses', title: 'Build a better defense.', text: 'Drag a rate limiter or load balancer onto its matching network slot. You can also click to add. Extra servers need a load balancer to share incoming work.' },
  { target: 'metrics', title: 'Ask why. Try again.', text: 'The Inspector holds your resource meters, full history, and advanced settings. “Why is this happening?” opens your contextual guide. When you’re ready, investigate The Midnight Outage.' },
];

export function Walkthrough({ step, onStep, onClose }: { step: number | 'welcome' | null; onStep: (step: number) => void; onClose: () => void }) {
  useEffect(() => {
    if (typeof step !== 'number') return;
    const element = document.querySelector(`[data-tour="${tourSteps[step].target}"]`);
    element?.classList.add('tour-highlight');
    element?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    return () => element?.classList.remove('tour-highlight');
  }, [step]);
  if (step === null) return null;
  if (step === 'welcome') return <div className="welcome-position"><section className="welcome-card" role="dialog" aria-labelledby="welcome-title" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}><button className="icon-button welcome-close" onClick={onClose} aria-label="Dismiss welcome"><X size={16} /></button><span className="welcome-icon"><Compass size={23} /></span><span className="section-eyebrow">YOUR NEXT EXPERIMENT STARTS HERE</span><h2 id="welcome-title">Welcome to CyberLab.</h2><p>Your server is operating normally. Want to see what happens when traffic increases?</p><div className="welcome-actions"><button className="button button-primary" onClick={() => onStep(0)}>Show me around<ArrowRight size={14} /></button><button className="text-button" onClick={onClose}>Explore myself</button></div></section></div>;
  return <section className="tour-card" role="dialog" aria-labelledby="tour-title" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}><div className="tour-top"><span><Network size={15} /> QUICK TOUR <b>{step + 1} / {tourSteps.length}</b></span><button className="icon-button" onClick={onClose} aria-label="Skip walkthrough"><X size={17} /></button></div><h2 id="tour-title">{tourSteps[step].title}</h2><p>{tourSteps[step].text}</p><div className="tour-actions"><button className="text-button" onClick={onClose}>Skip tour</button><div>{step > 0 && <button className="icon-button" onClick={() => onStep(step - 1)} aria-label="Previous tour step"><ArrowLeft size={17} /></button>}<button className="button button-primary" onClick={() => step === tourSteps.length - 1 ? onClose() : onStep(step + 1)}>{step === tourSteps.length - 1 ? 'Let’s experiment' : 'Next'}<ArrowRight size={14} /></button></div></div></section>;
}
