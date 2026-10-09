import { createHash } from 'node:crypto';
import type { Store } from './store.ts';
import type { Message, Target } from './types.ts';
export function addSeconds(date:string,n:number):string { return new Date(Date.parse(date)+n*1000).toISOString(); }
export function localParts(date:string,zone:string):{day:string;hour:number} {
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(date));
  const v=(t:string)=>p.find(x=>x.type===t)!.value;
  return {day:v('year')+'-'+v('month')+'-'+v('day'),hour:Number(v('hour'))};
}
export function nextMorning(date:string,zone:string):string {
  // Interview fixtures do not cross DST. Probe time-zone-aware hours instead of hardcoding an offset.
  let t=Math.floor(Date.parse(date)/3600000)*3600000+3600000;
  for(let i=0;i<49;i++,t+=3600000) if(localParts(new Date(t).toISOString(),zone).hour===8) return new Date(t).toISOString();
  throw new Error('No morning found');
}
export function acceptedToday(store:Store,m:Message):number {
  const zone=store.user(m.userId).zone, day=localParts(store.now(),zone).day;
  return store.messages().filter(x=>x.userId===m.userId&&x.purpose==='engagement'&&x.acceptedAt&&localParts(x.acceptedAt,zone).day===day).length;
}
export function bucket(userId:string,experimentId:string):number {
  return createHash('sha256').update(userId+':'+experimentId).digest().readUInt32BE(0)%100;
}
export function render(template:string,service:string):string {
  const templates:Record<string,string>={confirmation:'Your '+service+' request is confirmed.',match:'New '+service+' request matched to you.',followup:'How was your '+service+' service?',A:'Rate your '+service+' experience.',B:'Tell us about your '+service+' visit.'};
  if(!templates[template]||!service) throw new Error('Invalid template data');
  return templates[template];
}
export function draft(overrides:Partial<Message>={},now='2026-10-15T17:00:00.000Z'):Message {
  const id=overrides.id??crypto.randomUUID();
  return {id,eventId:'seed-'+id,jobId:'job-1',service:'Plumbing',userId:'customer',channel:'email',purpose:'transactional',template:'confirmation',scheduledAt:now,body:'Your Plumbing request is confirmed.',status:'pending',reason:'queued',nextAt:now,expiresAt:null,experimentId:null,attempts:0,key:id,providerId:null,acceptedAt:null,receiptSeq:0,consentRevision:null,group:null,...overrides};
}
