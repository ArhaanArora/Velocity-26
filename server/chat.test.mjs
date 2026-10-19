import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChatServer, validateRequest } from './chat.mjs';
import { retrieve } from './knowledge.mjs';

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
test('invalid request and provider failure return safe errors',async()=>withServer({generate:async()=>{throw new Error('secret diagnostic');}},async url=>{
  let response=await fetch(url,{method:'POST',body:'invalid'});assert.equal(response.status,400);
  response=await fetch(url,{method:'POST',body:JSON.stringify(payload())});assert.equal(response.status,502);assert.ok(!JSON.stringify(await response.json()).includes('secret diagnostic'));
  response=await fetch(url,{method:'POST',headers:{Origin:'https://untrusted.example'},body:JSON.stringify(payload())});assert.equal(response.status,403);
}));
