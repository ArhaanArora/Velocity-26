import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChatServer, validateRequest } from './chat.mjs';
import { retrieve, retrieveForContext } from './knowledge.mjs';
import { buildGeminiRequest, providerDiagnostic } from './provider.mjs';

const payload = () => ({question:'Why is CPU high?',mode:'sandbox',tick:4,hintLevel:0,messages:[{role:'user',text:'Explain my server'}],config:{legitRate:50,attackRate:800,filterStrength:0,serverCount:1,perServerCapacity:300,perServerBandwidth:1000,perServerConnections:200,perServerQueue:500,attackType:'volume',loadBalancer:false},metrics:{incoming:850,blocked:0,legitServed:18,attackServed:282,legitDropped:32,attackDropped:518,queueDepth:200,cpuPercent:100,bandwidthPercent:85,connectionPercent:100,queuePercent:40,latencyMs:717,legitAvailabilityPercent:36,status:'down'}});
async function withServer(options,run) {
  const server=createChatServer(options);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try { await run(`http://127.0.0.1:${server.address().port}/api/chat`); }
  finally { await new Promise(resolve=>server.close(resolve)); }
}
test('retrieval selects relevant material and acknowledges unknown topics',()=>{
  assert.equal(retrieve('SYN connection exhaustion')[0].id,'connections');
  assert.ok(retrieve('rate limiting false positives').some(doc=>doc.id==='filter'));
  assert.deepEqual(retrieve('photosynthesis chlorophyll'),[]);
});
test('troubleshooting questions and follow-ups retrieve contextually relevant documents',()=>{
  const metrics=payload().metrics;
  assert.ok(retrieveForContext('Why is my website crashing?',metrics).length>0);
  assert.ok(retrieveForContext('What should I change?',metrics).some(doc=>['resources','connections','troubleshooting'].includes(doc.id)));
  assert.ok(retrieveForContext('Why is it not helping?',{...metrics,cpuPercent:0,connectionPercent:0,latencyMs:50,legitAvailabilityPercent:100},[{role:'user',text:'What is a load balancer?'}]).some(doc=>doc.id==='balancing'));
});
test('SDK request includes real retrieved passages, measured context and native conversation roles',()=>{
  const input=payload();const passages=retrieveForContext(input.question,input.metrics,input.messages);
  const request=buildGeminiRequest({...input,passages},'gemini-flash-latest');
  assert.equal(request.contents[0].role,'user');
  const context=JSON.parse(request.contents.at(-1).parts[0].text);
  assert.equal(context.metrics.cpuPercent,100);assert.equal(context.config.attackRate,800);assert.equal(context.tick,4);
  assert.deepEqual(context.passages,passages);assert.ok(context.passages[0].text.length>50);
  assert.match(request.config.systemInstruction,/untrusted/);assert.match(request.config.systemInstruction,/progressive hints/);
  assert.equal(request.config.tools,undefined);
});
test('provider errors expose actionable categories without raw diagnostics',()=>{
  assert.equal(providerDiagnostic({status:400,message:'API key not valid. secret-value'}).code,'AUTH_FAILED');
  assert.equal(providerDiagnostic({status:404}).code,'MODEL_UNAVAILABLE');
  assert.equal(providerDiagnostic({status:429}).code,'QUOTA_EXCEEDED');
  assert.equal(providerDiagnostic({message:'timeout'}).status,504);
  assert.ok(!JSON.stringify(providerDiagnostic({status:403,message:'secret-value'})).includes('secret-value'));
});
test('health identifies the API and reports missing configuration honestly',async()=>withServer({apiKey:''},async url=>{
  const response=await fetch(url.replace('/chat','/health'));const data=await response.json();
  assert.equal(data.service,'cyberlab-tutor');assert.equal(data.configured,false);assert.equal(data.liveVerified,false);assert.ok(data.knowledgeDocuments>=9);
}));
test('request validation rejects oversize/history and strips arbitrary properties',()=>{
  assert.throws(()=>validateRequest({...payload(),question:'a'.repeat(1001)}));
  assert.throws(()=>validateRequest({...payload(),messages:Array(13).fill({role:'user',text:'hi'})}));
  const input=payload();input.config.apiKey='must not forward';
  assert.equal(validateRequest(input).config.apiKey,undefined);
  input.metrics.cpuPercent=NaN;assert.throws(()=>validateRequest(input));
});
test('missing key returns a clear 503 without calling a provider',async()=>withServer({apiKey:''},async url=>{
  const response=await fetch(url,{method:'POST',body:JSON.stringify(payload())});
  assert.equal(response.status,503);assert.match((await response.json()).error,/GEMINI_API_KEY/);
}));
test('endpoint forwards actual context/history and returns only cited source references',async()=>{
  let received;
  await withServer({generate:async data=>{ received=data; return `CPU is ${data.metrics.cpuPercent}% [resources]`; }},async url=>{
    const response=await fetch(url,{method:'POST',body:JSON.stringify({...payload(),mode:'challenge',hintLevel:1})});
    const result=await response.json();assert.equal(response.status,200);assert.equal(result.provider,'gemini');assert.match(result.answer,/100%/);assert.equal(result.sources[0].id,'resources');
  });
  assert.equal(received.mode,'challenge');assert.equal(received.hintLevel,1);assert.equal(received.messages[0].text,'Explain my server');assert.equal(received.config.attackRate,800);
});
test('each chat request uses its own current simulation measurements',async()=>{
  const snapshots=[];
  await withServer({generate:async data=>{snapshots.push(data);return 'Inspect your measured signals [resources]';}},async url=>{
    const first=payload();
    await fetch(url,{method:'POST',body:JSON.stringify(first)});
    const next=payload();next.tick=5;next.config.loadBalancer=true;next.config.serverCount=3;next.metrics.cpuPercent=40;next.metrics.legitAvailabilityPercent=100;
    await fetch(url,{method:'POST',body:JSON.stringify(next)});
  });
  assert.equal(snapshots[0].metrics.cpuPercent,100);assert.equal(snapshots[1].metrics.cpuPercent,40);
  assert.equal(snapshots[1].tick,5);assert.equal(snapshots[1].config.serverCount,3);
});
test('invalid request and provider failure return safe errors',async()=>withServer({generate:async()=>{throw new Error('secret diagnostic');}},async url=>{
  let response=await fetch(url,{method:'POST',body:'invalid'});assert.equal(response.status,400);
  response=await fetch(url,{method:'POST',body:JSON.stringify(payload())});assert.equal(response.status,502);assert.ok(!JSON.stringify(await response.json()).includes('secret diagnostic'));
  response=await fetch(url,{method:'POST',headers:{Origin:'https://untrusted.example'},body:JSON.stringify(payload())});assert.equal(response.status,403);
}));
