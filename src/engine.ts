import type { Store } from './store.ts';
import type { Decision,Event,Message,Provider } from './types.ts';
import type { Context } from './context.ts';
import { draft,render } from './helpers.ts';
import * as t1 from './tasks/t1-routing.ts';
import * as t2 from './tasks/t2-consent.ts';
import * as t3 from './tasks/t3-dedup.ts';
import * as t4 from './tasks/t4-schedule.ts';
import * as t5 from './tasks/t5-recovery.ts';
import * as t6 from './tasks/t6-limits.ts';
import * as t8 from './tasks/t8-experiment.ts';

export function context(store:Store,provider:Provider):Context {
  const ctx:Context={store,provider,decide:(m)=>decide(m,ctx),unsupported:()=>[['T2',t2.implemented],['T4',t4.implemented],['T6',t6.implemented],['T8',t8.implemented]].filter(x=>!x[1]).map(x=>String(x[0]))};
  return ctx;
}
export function decide(m:Message,ctx:Context):Decision {
  const results=[t2.check(m,ctx),t4.check(m,ctx),t8.check(m,ctx),t6.check(m,ctx)].filter((d):d is Decision=>d!==null);
  const terminal=results.find(d=>['suppress','expire','hold'].includes(d.action));
  if(terminal) return terminal;
  const waits=results.filter(d=>d.action==='defer');
  if(waits.length) {
    const nextAt=waits.map(d=>d.nextAt!).sort().at(-1)!;
    if(m.expiresAt&&nextAt>=m.expiresAt) return {action:'expire',reason:'expires_before_eligible'};
    const reason=waits.find(x=>x.reason==='quiet_hours'||x.reason==='frequency_cap')?.reason??waits[0].reason;
    return {action:'defer',reason,nextAt};
  }
  return results.find(d=>d.action==='send')??{action:'send',reason:'eligible'};
}
export function apply(m:Message,d:Decision,ctx:Context):void {
  m.reason=d.reason;
  if(d.group)m.group=d.group;
  if(d.body)m.body=d.body;
  m.consentRevision=ctx.store.user(m.userId).revision;
  if(d.action==='defer'){m.status='pending';m.nextAt=d.nextAt!;}
  else if(d.action==='suppress')m.status='suppressed';
  else if(d.action==='expire')m.status='expired';
  else if(d.action==='hold')m.status='held_out';
  ctx.store.save(m);
}
export function ingest(e:Event,ctx:Context):Message[] {
  ctx.store.job(e.jobId);
  return t3.ingest(e,ctx.store,()=>{
    const job=ctx.store.job(e.jobId);
    const targets=t1.targets(e,ctx.store);
    const messages=targets.map(target=>{
      ctx.store.user(target.userId);
      return draft({...target,eventId:e.id,jobId:e.jobId,service:job.service,body:render(target.template,job.service),nextAt:target.scheduledAt,experimentId:target.purpose==='engagement'?'followup-v1':null},ctx.store.now());
    });
    for(const m of messages)ctx.store.save(m);
    return messages;
  });
}
export async function tick(ctx:Context):Promise<Message[]> {
  const list=ctx.store.messages().filter(m=>m.status==='pending'||m.status==='reconciling').sort((a,b)=>Number(b.status==='reconciling')-Number(a.status==='reconciling'));
  for(const m of list) {
    if(m.status==='pending'){const d=ctx.decide(m);apply(m,d,ctx);if(d.action!=='send')continue;}
    await t5.process(m,ctx);
  }
  return ctx.store.messages();
}
