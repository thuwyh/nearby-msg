import type { Accepted,Message,Provider,SendResult } from './types.ts';
export class HttpProvider implements Provider {
  constructor(readonly url:string) {}
  async send(m:Message):Promise<SendResult> {
    try { const r=await fetch(this.url+'/send',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:m.key,userId:m.userId,channel:m.channel,body:m.body}),signal:AbortSignal.timeout(2000)});
      if(!r.ok) return {kind:'permanent_failure'};
      return await r.json() as SendResult;
    } catch {return {kind:'unknown'};}
  }
  async lookup(key:string):Promise<Accepted|null> {
    const r=await fetch(this.url+'/lookup?key='+encodeURIComponent(key),{signal:AbortSignal.timeout(2000)});
    if(!r.ok)throw new Error('Provider lookup unavailable');
    return await r.json() as Accepted|null;
  }
}
