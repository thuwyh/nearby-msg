import type { Event,Target } from '../types.ts';
import type { Store } from '../store.ts';
import { addSeconds } from '../helpers.ts';
export const implemented=false;
export function targets(e:Event,store:Store):Target[] {
  const job=store.job(e.jobId);
  if(e.type==='provider.matched') return []; // T1: notify each matched professional.
  return [{userId:job.customerId,channel:'email',purpose:e.type==='job.completed'?'engagement':'transactional',template:e.type==='job.completed'?'followup':'confirmation',scheduledAt:addSeconds(store.now(),e.type==='job.completed'?86400:0)}];
}
