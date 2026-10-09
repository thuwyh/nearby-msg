import type { Message } from '../types.ts';
import type { Context } from '../context.ts';
export const implemented=false;
export async function process(m:Message,ctx:Context):Promise<void> {
  // T5: preserve attempt identity and recover uncertain outcomes.
  m.attempts++;ctx.store.save(m);
  const r=await ctx.provider.send(m);
  if(r.kind==='accepted'){m.status='accepted';m.providerId=r.message.id;m.acceptedAt=r.message.acceptedAt;m.reason='provider_accepted';}
  else {m.status='failed';m.reason=r.kind;}
  ctx.store.put('attempt',m.id+':'+m.attempts,{messageId:m.id,number:m.attempts,at:ctx.store.now(),result:r.kind});
  ctx.store.save(m);
}
