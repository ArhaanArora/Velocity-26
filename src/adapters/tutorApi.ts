import type { SimulationConfig, SimulationMetrics } from '../shared/simulationTypes';
import type { Mode } from '../hooks/useSimulation';
export interface TutorSource { id: string; title: string }
export interface TutorRequest { question: string; messages: {role:'user'|'assistant'; text:string}[]; config:SimulationConfig; metrics:SimulationMetrics; mode:Mode; tick:number; hintLevel:number }
const diagnostics: Record<string,string> = {
  NOT_CONFIGURED:'Gemini is not configured. Add GEMINI_API_KEY to .env and restart the app.',
  AUTH_FAILED:'Gemini rejected the server key or permissions. Replace GEMINI_API_KEY and restart the app.',
  MODEL_UNAVAILABLE:'The Gemini model is unavailable to this account. Check GEMINI_MODEL and restart the app.',
  QUOTA_EXCEEDED:'Gemini quota or rate limit reached. Check the account quota or try again later.',
  BUSY:'Another AI request is running. Try again shortly.',
  TIMEOUT:'Gemini took too long to respond. Please retry.',
  EMPTY_RESPONSE:'Gemini returned no answer. Try rephrasing your question.',
  PROVIDER_UNAVAILABLE:'The Gemini service could not be reached. Check the API server internet connection.',
};
export async function getTutorHealth(signal: AbortSignal): Promise<string> {
  let response: Response;
  try { response = await fetch('/api/health',{signal,cache:'no-store'}); }
  catch { throw new Error('Tutor API is offline. Start both services with npm run dev.'); }
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Tutor API proxy is unavailable. Restart the app with npm run dev (or npm run preview).');
  const data = await response.json();
  if(data.service !== 'cyberlab-tutor') throw new Error('The chat endpoint is not the CyberLab tutor API. Restart the app.');
  return data.configured ? data.liveVerified ? 'Gemini connected · retrieval ready' : 'Server configured · Gemini connection not yet verified' : diagnostics.NOT_CONFIGURED;
}
export async function requestTutorAnswer(request: TutorRequest, signal: AbortSignal): Promise<{answer:string; sources:TutorSource[]}> {
  const response = await fetch('/api/chat', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal});
  if (!response.ok) {
    const data = await response.json().catch(()=>null);
    throw new Error(diagnostics[data?.code] ?? (response.status === 404 ? 'Chat API route not found. Restart the app with npm run dev to load the proxy.' : 'Tutor API is unavailable. Start both services with npm run dev.'));
  }
  if(!response.headers.get('content-type')?.includes('application/json')) throw new Error('The chat route returned a webpage. Restart the frontend to load the API proxy.');
  const data = await response.json();
  if (data.provider !== 'gemini' || typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 6000) throw new Error('The AI tutor returned an invalid response.');
  return { answer:data.answer, sources:Array.isArray(data.sources) ? data.sources.filter((source: TutorSource) => typeof source?.id === 'string' && typeof source?.title === 'string').slice(0,3) : [] };
}
