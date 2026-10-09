import type { Store } from './store.ts';
import type { Decision,Message,Provider } from './types.ts';
export interface Context { store:Store; provider:Provider; decide:(m:Message)=>Decision; unsupported:()=>string[] }
