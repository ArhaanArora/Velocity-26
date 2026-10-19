import { spawn } from 'node:child_process';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
const root = fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
if (existsSync('.env')) loadEnvFile('.env');
const {createChatServer} = await import('./chat.mjs');
const api = createChatServer();
let ownsApi = false;
try {
  await new Promise((resolve,reject)=>{api.once('error',reject);api.listen(8787,'127.0.0.1',resolve);});
  ownsApi = true;
  console.log('Cyber Tutor API ready on 127.0.0.1:8787. Credentials stay server-side.');
} catch (error) {
  if (error.code !== 'EADDRINUSE') throw error;
  const health = await fetch('http://127.0.0.1:8787/api/health',{signal:AbortSignal.timeout(2000)}).then(response=>response.json()).catch(()=>null);
  if (health?.service !== 'cyberlab-tutor') throw new Error('Port 8787 is occupied by another service. Stop that service before starting CyberLab.');
  console.log('Reusing the running Cyber Tutor API. Restart it after editing .env.');
}
const preview = process.argv.includes('--preview');
const child = spawn(process.execPath,[fileURLToPath(new URL('../node_modules/vite/bin/vite.js',import.meta.url)),...(preview?['preview']:[]),'--host','127.0.0.1','--strictPort',...process.argv.slice(2).filter(arg=>arg!=='--preview')],{cwd:root,stdio:'inherit',windowsHide:true});
let stopping = false;
function stop(code=0) { if(stopping)return;stopping=true;child.kill();if(ownsApi){api.closeAllConnections();api.close();}process.exitCode=code; }
child.on('error',()=>stop(1));child.on('exit',code=>stop(code??0));
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
