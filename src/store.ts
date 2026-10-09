import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Event, Job, Message, User } from './types.ts';

export class Store {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id));');
  }
  get<T>(kind: string, id: string): T | undefined {
    const row = this.db.prepare('SELECT data FROM records WHERE kind=? AND id=?').get(kind,id);
    return row ? JSON.parse(String(row.data)) as T : undefined;
  }
  all<T>(kind: string): T[] {
    return this.db.prepare('SELECT data FROM records WHERE kind=? ORDER BY rowid').all(kind).map(r=>JSON.parse(String(r.data)) as T);
  }
  put<T>(kind: string, id: string, data: T): void {
    this.db.prepare('INSERT INTO records(kind,id,data) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data').run(kind,id,JSON.stringify(data));
  }
  transaction<T>(fn:()=>T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value=fn(); this.db.exec('COMMIT'); return value; }
    catch(error) { this.db.exec('ROLLBACK'); throw error; }
  }
  now(): string { return this.get<string>('meta','clock') ?? '2026-10-15T17:00:00.000Z'; }
  clock(now: string): void { if(!Number.isFinite(Date.parse(now))) throw new Error('Invalid time'); this.put('meta','clock',new Date(now).toISOString()); }
  messages(): Message[] { return this.all<Message>('message'); }
  user(id: string): User { const u=this.get<User>('user',id); if(!u) throw new Error('Unknown user: '+id); return u; }
  job(id: string): Job { const j=this.get<Job>('job',id); if(!j) throw new Error('Unknown job'); return j; }
  save(m: Message): void { this.put('message',m.id,m); }
  audit(type:string, data:unknown): void { this.put('audit',crypto.randomUUID(),{type,at:this.now(),data}); }
  seed(): void {
    this.db.exec('DELETE FROM records');
    this.clock('2026-10-15T17:00:00Z');
    for(const [id,name] of [['customer','Alex'],['pro-1','Jordan'],['pro-2','Sam']]) this.put<User>('user',id,{id,name,zone:'America/Los_Angeles',email:true,sms:true,dnc:false,revision:1});
    this.put<Job>('job','job-1',{id:'job-1',customerId:'customer',providers:['pro-1','pro-2'],service:'Plumbing'});
  }
  consent(id:string, changes:Partial<Pick<User,'email'|'sms'|'dnc'>>, actor:string): User {
    return this.transaction(()=>{const user={...this.user(id),...changes,revision:this.user(id).revision+1};
      this.put('user',id,user); this.put('consent',id+':'+user.revision,{...user,actor,source:'preferences',at:this.now()}); return user;});
  }
}
export function signature(event:Event):string { return JSON.stringify([event.id,event.type,event.jobId]); }
