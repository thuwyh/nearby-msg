import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync,readFileSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
const file=process.env.PROVIDER_DB??resolve('.data/provider.sqlite');mkdirSync(dirname(file),{recursive:true});
const db=new DatabaseSync(file);
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS entries(kind TEXT,id TEXT,data TEXT,PRIMARY KEY(kind,id))');
const get=(k,id)=>{const r=db.prepare('SELECT data FROM entries WHERE kind=? AND id=?').get(k,id);return r?JSON.parse(r.data):null;};
const set=(k,id,v)=>db.prepare('INSERT INTO entries VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data').run(k,id,JSON.stringify(v));
const all=k=>db.prepare('SELECT data FROM entries WHERE kind=? ORDER BY rowid').all(k).map(r=>JSON.parse(r.data));
const paused=[];
const home=readFileSync(new URL('./local-home.html',import.meta.url),'utf8')
  .replaceAll('{{SERVICE}}','Simulated provider · 模拟供应商')
  .replaceAll('{{DESCRIPTION}}','This is the local provider API. It accepts simulated sends and records their outcomes. The interview task page is linked below.')
  .replaceAll('{{DESCRIPTION_ZH}}','这里是本地模拟供应商接口，负责接收模拟发送并记录结果。题面请打开下方链接。')
  .replaceAll('{{API_URL}}','http://127.0.0.1:'+(process.env.PORT??4310))
  .replaceAll('{{PROVIDER_URL}}','');
const server=createServer(async(req,res)=>{
  if(req.method==='GET'&&new URL(req.url,'http://localhost').pathname==='/'){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(home);return;
  }
  let code=200,result;
  try {
    let raw='';for await(const chunk of req)raw+=chunk;
    const b=raw?JSON.parse(raw):{},u=new URL(req.url,'http://localhost');
    if(u.pathname==='/health')result={ok:true};
    else if(req.method==='POST'&&u.pathname==='/reset'){db.exec('DELETE FROM entries');result={ok:true};}
    else if(req.method==='POST'&&u.pathname==='/clock'){set('meta','clock',b.now);result={ok:true};}
    else if(req.method==='POST'&&u.pathname==='/fault'){set('fault',b.userId,b.modes);result={ok:true};}
    else if(req.method==='POST'&&u.pathname==='/release'){for(const resume of paused.splice(0))resume();result={ok:true};}
    else if(req.method==='GET'&&u.pathname==='/records')result={messages:all('message'),calls:all('call')};
    else if(req.method==='GET'&&u.pathname==='/lookup')result=get('message',u.searchParams.get('key'));
    else if(req.method==='POST'&&u.pathname==='/send'){
      const prior=get('message',b.key);
      set('call',crypto.randomUUID(),{...b,at:get('meta','clock')});
      if(prior){
        if(prior.userId!==b.userId||prior.channel!==b.channel||prior.body!==b.body){code=409;result={error:'Idempotency payload conflict'};}
        else result={kind:'accepted',message:prior};
      } else {
        const plan=get('fault',b.userId)??[],mode=plan.shift()??'accepted';set('fault',b.userId,plan);
        if(mode==='accepted'||mode==='after_timeout'||mode==='after_pause'){
          const message={...b,id:crypto.randomUUID(),acceptedAt:get('meta','clock')??'2026-10-15T17:00:00.000Z'};
          set('message',b.key,message);if(mode==='after_pause')await new Promise(r=>paused.push(r));result=mode==='after_timeout'?{kind:'unknown'}:{kind:'accepted',message};
        }else result={kind:mode==='before_timeout'?'unknown':mode};
      }
    }else {code=404;result={error:'Unknown route'};}
  }catch(e){code=400;result={error:e.message};}
  res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(result));
});
server.listen(Number(process.env.PROVIDER_PORT??4311),'127.0.0.1',()=>console.log('Simulator http://127.0.0.1:'+(process.env.PROVIDER_PORT??4311)));
process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0);}));
