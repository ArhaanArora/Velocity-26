import type { SimulationConfig, SimulationMetrics } from '../shared/simulationTypes';
import type { Mode } from '../hooks/useSimulation';
export interface TutorSource { id: string; title: string }
export interface TutorRequest { question: string; messages: {role:'user'|'assistant'; text:string}[]; config:SimulationConfig; metrics:SimulationMetrics; mode:Mode; tick:number; hintLevel:number }
export async function requestTutorAnswer(request: TutorRequest, signal: AbortSignal): Promise<{answer:string; sources:TutorSource[]}> {
  const response = await fetch('/api/chat', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal});
  if (!response.ok) {
    if (response.status === 503) throw new Error('Gemini is not configured yet. Add the server API key when ready.');
    if (response.status === 429) throw new Error('The AI tutor is busy. Try again shortly.');
    throw new Error('The AI tutor is unavailable. Check that the local API server is running and configured.');
  }
  const data = await response.json();
  if (data.provider !== 'gemini' || typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 6000) throw new Error('The AI tutor returned an invalid response.');
  return { answer:data.answer, sources:Array.isArray(data.sources) ? data.sources.filter((source: TutorSource) => typeof source?.id === 'string' && typeof source?.title === 'string').slice(0,3) : [] };
}
