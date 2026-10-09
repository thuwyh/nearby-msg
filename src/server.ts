import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Store } from './store.ts';
import { HttpProvider } from './provider.ts';
import { context,ingest,tick } from './engine.ts';
import { receive } from './tasks/t7-receipts.ts';
import { preview } from './tasks/t9-preview.ts';
import { retry } from './tasks/t10-support.ts';
import { fixture,names } from './fixtures.ts';
import { draft } from './helpers.ts';
import type { Event,Message,Receipt,User } from './types.ts';

const store=new Store(process.env.LAB_DB??resolve('.data/lab.sqlite'));
if(!store.all<User>('user').length)store.seed();
const providerUrl=process.env.PROVIDER_URL??'http://127.0.0.1:4311';
const ctx=context(store,new HttpProvider(providerUrl));
const assets:Record<string,[string,string]>={
  '/':['index.html','text/html; charset=utf-8'],
  '/workbench/style.css':['style.css','text/css; charset=utf-8'],
  '/workbench/app.js':['app.js','text/javascript; charset=utf-8']
};
const string=(v:unknown):string=>{if(typeof v!=='string'||!v)throw new Error('Expected nonempty string');return v;};
const date=(v:unknown):string=>{const d=new Date(string(v));if(!Number.isFinite(d.getTime()))throw new Error('Invalid date');return d.toISOString();};
async function control(path:string,body:unknown):Promise<void> {
  const r=await fetch(providerUrl+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok)throw new Error('Simulator unavailable');
}
let serial=Promise.resolve();
const server=createServer((req,res)=>{
  const asset=assets[new URL(req.url??'/', 'http://localhost').pathname];
  if(req.method==='GET'&&asset){
    res.writeHead(200,{'content-type':asset[1],'cache-control':'no-store'});
    res.end(readFileSync(new URL('../tools/workbench/'+asset[0],import.meta.url)));return;
  }
  const job=async()=>{
    let status=200;
    try {
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>200000)throw new Error('Body too large');}
      const b=(raw?JSON.parse(raw):{}) as Record<string,unknown>;
      const u=new URL(req.url??'/', 'http://localhost'),path=u.pathname;
      let result:unknown;
      if(req.method==='GET'&&path==='/health')result={ok:true,now:store.now(),unsupported:ctx.unsupported()};
      else if(req.method==='GET'&&path==='/dev/state')result={now:store.now(),messages:store.messages(),users:store.all<User>('user'),jobs:store.all('job'),audit:store.all('audit')};
      // Local workbench only: fixed provider routes, never an arbitrary URL proxy.
      else if((req.method==='GET'&&path==='/dev/provider/records')||(req.method==='POST'&&['/dev/provider/fault','/dev/provider/release'].includes(path))){
        if(path.endsWith('/fault')){
          string(b.userId);
          const modes=['accepted','temporary_failure','permanent_failure','before_timeout','after_timeout','after_pause'];
          if(!Array.isArray(b.modes)||!b.modes.every(mode=>typeof mode==='string'&&modes.includes(mode)))throw new Error('Invalid provider fault sequence');
        }
        const r=await fetch(providerUrl+path.slice('/dev/provider'.length),{method:req.method,headers:{'content-type':'application/json'},body:req.method==='POST'?JSON.stringify(b):undefined,signal:AbortSignal.timeout(5000)});
        status=r.status;result=await r.json();
      }
      else if(req.method==='GET'&&path==='/messages')result=store.messages();
      else if(req.method==='GET'&&path.startsWith('/messages/')){
        const id=decodeURIComponent(path.slice(10));const message=store.get<Message>('message',id);
        if(!message){status=404;result={error:'Unknown message'};}
        else result={message,attempts:store.all<Record<string,unknown>>('attempt').filter(a=>a.messageId===id),receipts:store.all<Receipt>('receipt').filter(r=>r.providerId===message.providerId),audit:store.all('audit')};
      }
      else if(req.method==='GET'&&path==='/users')result=store.all<User>('user');
      else if(req.method==='GET'&&path==='/audit')result=store.all('audit');
      else if(req.method==='GET'&&path==='/fixtures')result=names;
      else if(req.method==='POST'&&path==='/events'){
        if(!['request.created','provider.matched','job.completed'].includes(String(b.type)))throw new Error('Unsupported event');
        result=ingest({id:string(b.id),type:b.type as Event['type'],jobId:string(b.jobId)},ctx);
      }
      else if(req.method==='POST'&&path==='/consent'){
        const changes:Partial<Pick<User,'email'|'sms'|'dnc'>>={};
        for(const key of ['email','sms','dnc'] as const)if(b[key]!==undefined){if(typeof b[key]!=='boolean')throw new Error('Expected boolean');changes[key]=b[key];}
        result=store.consent(string(b.userId),changes,'preferences');
      }
      else if(req.method==='POST'&&path==='/tick')result=await tick(ctx);
      else if(req.method==='POST'&&path==='/clock'){
        const now=date(b.now);if(now<store.now())throw new Error('Clock cannot move backwards; reset first');
        store.clock(now);await control('/clock',{now});result={now};
      }
      else if(req.method==='POST'&&path==='/receipts'){
        if(!Number.isSafeInteger(b.sequence)||Number(b.sequence)<1||!['accepted','delivered','failed'].includes(String(b.status)))throw new Error('Invalid receipt');
        receive({id:string(b.id),providerId:string(b.providerId),sequence:Number(b.sequence),status:b.status as Receipt['status']},store);result={ok:true};
      }
      else if(req.method==='POST'&&path==='/preview'){
        if(!Array.isArray(b.users)||!b.users.every(v=>typeof v==='string'))throw new Error('Expected user ID list');
        result=preview({users:b.users,scheduledAt:b.scheduledAt?date(b.scheduledAt):store.now(),experimentId:b.experimentId==null?null:string(b.experimentId)},ctx);
      }
      else if(req.method==='POST'&&path.match(/^\/messages\/[^/]+\/retry$/)){
        const token=req.headers['x-api-key'];const actor=token==='operator-demo'?'operator':token==='viewer-demo'?'viewer':null;
        if(!actor){status=401;result={error:'Use a supplied demo identity'};}
        else result=retry(decodeURIComponent(path.split('/')[2]),actor,string(b.requestId),store);
      }
      // Local-only fixture endpoints; not a production authentication surface.
      else if(req.method==='POST'&&path==='/dev/reset'){fixture(String(b.fixture??'baseline'),store);await control('/reset',{});await control('/clock',{now:store.now()});result={ok:true};}
      else if(req.method==='POST'&&path==='/dev/message'){const m=draft(b as Partial<Message>,store.now());store.user(m.userId);store.save(m);result=m;}
      else if(req.method==='POST'&&path==='/dev/job'){store.put('job',string(b.id),b);result=b;}
      else if(req.method==='POST'&&path==='/dev/user'){const user={id:string(b.id),name:String(b.name??b.id),zone:'America/Los_Angeles',email:true,sms:true,dnc:false,revision:1,...b} as User;store.put('user',user.id,user);result=user;}
      else {status=404;result={error:'Unknown route'};}
      res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(result));
    } catch(error) {
      const message=error instanceof Error?error.message:'Request failed';
      status=message.startsWith('Forbidden')?403:message.includes('Conflict')?409:400;
      res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({error:message}));
    }
  };
  serial=serial.then(job,job);
});
const port=Number(process.env.PORT??4310);
server.listen(port,'127.0.0.1',()=>console.log('Messaging API http://127.0.0.1:'+port));
function shutdown(){server.close(()=>{store.db.close();process.exit(0);});}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
