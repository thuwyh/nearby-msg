import type { Store } from './store.ts';
import { addSeconds,draft } from './helpers.ts';
export const names=['baseline','T1','T2','T3','T4','T5','T6','T7','T8','T9','T10'];
export function fixture(name:string,s:Store):void {
  if(!names.includes(name))throw new Error('Unknown fixture');
  s.seed();const now=s.now();
  if(name==='T2'){s.consent('customer',{sms:false},'fixture');s.save(draft({id:'m1',channel:'sms'}));}
  if(name==='T4'){s.save(draft({id:'m1',scheduledAt:addSeconds(now,600),nextAt:addSeconds(now,600)}));s.save(draft({id:'m2',expiresAt:now}));}
  if(name==='T5')s.save(draft({id:'m1'}));
  if(name==='T6'){for(const id of ['m1','m2','m3'])s.save(draft({id,purpose:'engagement'}));}
  if(name==='T7')s.save(draft({id:'m1',status:'accepted',providerId:'p1',acceptedAt:now}));
  if(name==='T8'){for(const id of ['customer','pro-1','pro-2'])s.save(draft({id:'m-'+id,userId:id,purpose:'engagement',experimentId:'followup-v1'}));}
  if(name==='T9')s.consent('pro-1',{email:false},'fixture');
  if(name==='T10')s.save(draft({id:'m1',status:'failed',reason:'temporary_failure',attempts:1}));
}
