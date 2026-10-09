// Local Electron renderer inspection for development; binds only to localhost.
import fs from 'node:fs';
const target=(await (await fetch('http://127.0.0.1:9223/json/list')).json()).find(x=>x.type==='page'&&x.url==='oc://renderer/index.html');
if(!target)throw new Error('OpenCode renderer is not available');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
let serial=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}};
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
try{
 if(process.argv[2]==='screenshot') {const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(process.argv[3],Buffer.from(r.data,'base64'));console.log(process.argv[3]);}
 else {const expr=fs.readFileSync(process.argv[2],'utf8');const r=await call('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)console.log(JSON.stringify(r.exceptionDetails));else console.log(JSON.stringify(r.result.value));}
}finally{ws.close();}
