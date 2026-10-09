import type { Context } from '../context.ts';
import type { Decision } from '../types.ts';
export interface PreviewInput { users:string[]; scheduledAt:string; experimentId:string|null }
export interface PreviewResult { rows:Array<{userId:string;decision:Decision}>; counts:Record<string,number>; total:number; unsupported:string[] }
export const implemented=false;
export function preview(_input:PreviewInput,_ctx:Context):PreviewResult {
  // T9: use ctx.decide with ephemeral drafts; do not write/send.
  return {rows:[],counts:{},total:0,unsupported:[]};
}
