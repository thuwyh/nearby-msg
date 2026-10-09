import type { Receipt } from '../types.ts';
import type { Store } from '../store.ts';
export const implemented=false;
export function receive(r:Receipt,store:Store):void {
  const m=store.messages().find(m=>m.providerId===r.providerId);
  if(!m)throw new Error('Unknown provider message');
  // T7: make projection independent of arrival order.
  store.put('receipt',r.id,r);m.status=r.status;m.receiptSeq=r.sequence;store.save(m);
}
