import type { Message,Decision } from '../types.ts';
import type { Context } from '../context.ts';
export const implemented=false;
export function check(_m:Message,_ctx:Context):Decision|null {
  // T2: check the current per-channel consent and global do-not-contact.
  return null;
}
