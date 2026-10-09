import type { Context } from './context.ts';
import type { Event } from './types.ts';
import { ingest } from './engine.ts';

// Demo marketplace interactions feed the exercise's existing messaging engine.
// No routing, consent, delivery or retry policy belongs in this adapter.
export interface Journey {
  id: string;
  stage: 'submitted' | 'matched' | 'completed';
  history: { type: Event['type']; at: string; eventId: string }[];
}
export function actOnRequest(action: string, professionals: unknown, ctx: Context) {
  const job = ctx.store.job('job-1');
  const prior = ctx.store.get<Journey>('journey', job.id);
  let type: Event['type'], stage: Journey['stage'];
  if (action === 'submit' && !prior) { type = 'request.created'; stage = 'submitted'; }
  else if (action === 'match' && prior?.stage === 'submitted') { type = 'provider.matched'; stage = 'matched'; }
  else if (action === 'complete' && prior?.stage === 'matched') { type = 'job.completed'; stage = 'completed'; }
  else throw new Error('This action is not available at the current request stage');
  if (action === 'match') {
    if (!Array.isArray(professionals) || !professionals.length || !professionals.every(id => typeof id === 'string' && id !== job.customerId)) throw new Error('Select at least one professional');
    for (const id of professionals) ctx.store.user(id);
    ctx.store.put('job', job.id, { ...job, providers: [...new Set(professionals)] });
  }
  const event: Event = { id: crypto.randomUUID(), type, jobId: job.id };
  try {
    const messages = ingest(event, ctx);
    const journey: Journey = { id: job.id, stage, history: [...(prior?.history ?? []), { type, at: ctx.store.now(), eventId: event.id }] };
    ctx.store.put('journey', job.id, journey);
    return { journey, event, messages };
  } catch (error) {
    ctx.store.put('job', job.id, job);
    throw error;
  }
}
