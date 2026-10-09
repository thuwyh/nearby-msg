import type { Event,Message } from '../types.ts';
import type { Store } from '../store.ts';
export const implemented=false;
export function ingest(_e:Event,store:Store,create:()=>Message[]):Message[] {
  // T3: persist event identity and return the original messages on replay.
  return store.transaction(create);
}
