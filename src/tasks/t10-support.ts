import type { Store } from '../store.ts';
import type { Message } from '../types.ts';
export const implemented=false;
export function retry(id:string,actor:'viewer'|'operator',requestId:string,store:Store):Message {
  const m=store.get<Message>('message',id);if(!m)throw new Error('Unknown message');
  // T10: permission, state/attempt budget, idempotent operation and audit.
  m.status='pending';m.nextAt=store.now();store.save(m);
  store.audit('retry',{id,actor,requestId,result:'scheduled'});return m;
}
