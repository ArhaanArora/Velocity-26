import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { documents, retrieveForContext } from './knowledge.mjs';
import { DEFAULT_MODEL, generateGemini, providerDiagnostic } from './provider.mjs';

const configNumbers = ['legitRate','attackRate','filterStrength','serverCount','perServerCapacity','perServerBandwidth','perServerConnections','perServerQueue'];
const metricNumbers = ['incoming','blocked','legitServed','attackServed','legitDropped','attackDropped','queueDepth','cpuPercent','bandwidthPercent','connectionPercent','queuePercent','latencyMs','legitAvailabilityPercent'];
export function validateRequest(body) {
  if (!body || typeof body.question !== 'string' || !body.question.trim() || body.question.length > 1000 || !['sandbox','challenge'].includes(body.mode)) throw new Error('Invalid question or mode.');
  const pick = (input, keys) => Object.fromEntries(keys.map(key => {
    if (typeof input?.[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < 0 || input[key] > 1e12) throw new Error('Invalid simulation measurements.');
    return [key, input[key]];
  }));
  const config = pick(body.config, configNumbers), metrics = pick(body.metrics, metricNumbers);
  if (!['none','volume','syn'].includes(body.config.attackType) || typeof body.config.loadBalancer !== 'boolean' || !['normal','degraded','down'].includes(body.metrics.status) || !Number.isInteger(body.tick) || body.tick < 0 || !Number.isInteger(body.hintLevel) || body.hintLevel < 0 || body.hintLevel > 1000) throw new Error('Invalid simulation context.');
  if (!Array.isArray(body.messages) || body.messages.length > 12) throw new Error('Too much conversation history.');
  const messages = body.messages.map(message => {
    if (!['user','assistant'].includes(message?.role) || typeof message.text !== 'string' || message.text.length > 6000) throw new Error('Invalid conversation message.');
    return {role:message.role,text:message.text};
  });
  return { question:body.question.trim(), mode:body.mode, tick:body.tick, hintLevel:body.hintLevel, config:{...config,attackType:body.config.attackType,loadBalancer:body.config.loadBalancer}, metrics:{...metrics,status:body.metrics.status}, messages };
}

export function createChatServer({ apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL || DEFAULT_MODEL, generate } = {}) {
  let busy = false;
  let liveVerified = false;
  const configured = typeof apiKey === 'string' && !!apiKey.trim() && !/^(replace_|your_|changeme)/i.test(apiKey);
  return createServer(async (req,res) => {
    const send = (status,data) => { if (!res.destroyed) { res.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); } };
    if (req.url === '/api/health' && req.method === 'GET') return send(200,{service:'cyberlab-tutor',configured,model,knowledgeDocuments:documents.length,liveVerified});
    if (req.url !== '/api/chat' || req.method !== 'POST') return send(404,{code:'NOT_FOUND',error:'Not found.'});
    // No cross-origin access or tools; this endpoint is only for the local app.
    const origin = req.headers.origin;
    if (origin && !['http://127.0.0.1:5173','http://127.0.0.1:5174','http://127.0.0.1:4173','http://localhost:5173','http://localhost:5174','http://localhost:4173'].includes(origin)) return send(403,{error:'Origin not allowed.'});
    let input;
    try {
      let raw = ''; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 90000) return send(413,{error:'Message too large.'}); raw += chunk; }
      input = validateRequest(JSON.parse(raw));
    } catch { return send(400,{error:'Invalid chat request.'}); }
    if (!configured && !generate) return send(503,{code:'NOT_CONFIGURED',error:'Gemini is not configured. Add GEMINI_API_KEY to the server .env file and restart the app.'});
    if (busy) return send(429,{code:'BUSY',error:'Tutor is busy. Try again shortly.'});
    busy = true;
    const passages = retrieveForContext(input.question,input.metrics,input.messages);
    let timer;
    try {
      const run = generate ?? (data => generateGemini(data,apiKey,model));
      const answer = await Promise.race([run({...input,passages}), new Promise((_,reject) => { timer = setTimeout(() => reject(new Error('timeout')),32000); })]);
      if (typeof answer !== 'string' || !answer.trim()) throw new Error('empty');
      const text = answer.slice(0,6000);
      if (!generate) liveVerified = true;
      const sources = passages.filter(doc => text.includes(`[${doc.id}]`)).map(({id,title})=>({id,title}));
      send(200,{answer:text,provider:'gemini',sources,retrievedSources:passages.map(({id,title})=>({id,title})),contextTick:input.tick});
    } catch (error) { const diagnostic=providerDiagnostic(error); send(diagnostic.status,diagnostic); }
    finally { clearTimeout(timer); busy = false; }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createChatServer().listen(8787,'127.0.0.1',()=>console.log('Cyber Tutor API: http://127.0.0.1:8787 (key stays server-side)'));
}
