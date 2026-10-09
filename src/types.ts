export type Channel = 'email' | 'sms';
export type Purpose = 'transactional' | 'engagement';
export type Status = 'pending' | 'reconciling' | 'accepted' | 'delivered' | 'failed' | 'suppressed' | 'expired' | 'held_out';
export interface User { id: string; name: string; zone: string; email: boolean; sms: boolean; dnc: boolean; revision: number }
export interface Job { id: string; customerId: string; providers: string[]; service: string }
export interface Event { id: string; type: 'request.created' | 'provider.matched' | 'job.completed'; jobId: string }
export interface Target { userId: string; channel: Channel; purpose: Purpose; template: string; scheduledAt: string }
export interface Message extends Target {
  id: string; eventId: string; jobId: string; service: string; body: string; status: Status; reason: string;
  nextAt: string; expiresAt: string | null; experimentId: string | null; attempts: number;
  key: string; providerId: string | null; acceptedAt: string | null; receiptSeq: number;
  consentRevision: number | null; group: string | null;
}
export interface Decision { action: 'send' | 'defer' | 'suppress' | 'expire' | 'hold'; reason: string; nextAt?: string; group?: string; body?: string }
export interface Receipt { id: string; providerId: string; sequence: number; status: 'accepted' | 'delivered' | 'failed' }
export interface Accepted { id: string; key: string; acceptedAt: string }
export type SendResult = { kind: 'accepted'; message: Accepted } | { kind: 'temporary_failure' | 'permanent_failure' | 'unknown' };
export interface Provider { send(m: Message): Promise<SendResult>; lookup(key: string): Promise<Accepted | null> }
