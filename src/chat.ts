import { randomUUID } from "node:crypto";
import { Store, people } from "./store.ts";
import type { Conversation, Message, ReportRevision, ConversationMemory } from "./types.ts";
import { requireReport } from "./problems.ts";
import { HttpError } from "./errors.ts";
import { requireAttachments } from "./media.ts";
import { emptyMemory, requireMemory, requireLimit } from "./memory.ts";
export { HttpError } from "./errors.ts";

export function requireText(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 4000)
    throw new HttpError(400, "Enter a message between 1 and 4,000 characters.");
  return value.trim();
}
export class Chat {
  constructor(readonly store: Store) {}
  person(id: string) {
    const person = people.find((p) => p.id === id);
    if (!person) throw new HttpError(401, "Choose a valid demo identity.");
    return person;
  }
  conversation(actor: string, id: string): Conversation {
    const conversation = this.store.get<Conversation>("conversation", id);
    if (!conversation || !conversation.participantIds.includes(actor))
      throw new HttpError(404, "Conversation not found.");
    return conversation;
  }
  state(actor: string) {
    const person = this.person(actor);
    return {
      person,
      people,
      conversations: this.store
        .conversations()
        .filter((c) => c.participantIds.includes(actor)),
    };
  }
  messages(actor: string, id: string, options?: { beforeMessageId?: string; limit?: unknown }) {
    this.conversation(actor, id);
    let messages = this.store.messages(id);
    if (options?.beforeMessageId) {
      const index = messages.findIndex(m => m.id === options.beforeMessageId);
      if (index < 0) throw new HttpError(400, "Unknown message cursor.");
      messages = messages.slice(0, index);
    }
    return options ? messages.slice(-requireLimit(options.limit)) : messages;
  }
  send(
    actor: string,
    id: string,
    body: { text?: unknown; report?: unknown; attachments?: unknown },
  ): Message {
    this.conversation(actor, id);
    if (body.report !== undefined && this.person(actor).role !== "customer")
      throw new HttpError(403, "Only customers can submit problem reports.");
    const media = requireAttachments(body.attachments);
    if (media.length && body.report === undefined)
      throw new HttpError(400, "Attach media to a problem report.");
    const report = body.report === undefined ? undefined : requireReport(body.report);
    const message: Message = {
      id: randomUUID(),
      conversationId: id,
      senderId: actor,
      text: requireText(body.text),
      createdAt: new Date().toISOString(),
      ...(media.length
        ? { attachments: media.map(({ data, ...metadata }) => metadata) }
        : {}),
    };
    const revision: ReportRevision | undefined = report ? {
      id: randomUUID(), conversationId: id, version: 1, authorId: actor,
      text: message.text, report, attachments: message.attachments ?? [],
      sourceMessageId: message.id, createdAt: message.createdAt,
    } : undefined;
    if (revision) message.reportRef = this.store.reportReference(revision);
    this.store.transaction(() => {
      if (revision) this.store.putReport(revision);
      this.store.put("message", message.id, message);
      for (const attachment of media)
        this.store.putMedia(id, message.id, attachment);
    });
    return message;
  }
  report(actor: string, conversationId: string, id: string, version?: unknown) {
    this.conversation(actor, conversationId);
    if (version !== undefined && (!Number.isInteger(Number(version)) || Number(version) < 1))
      throw new HttpError(400, "Invalid report version.");
    const revision = this.store.get<ReportRevision>(
      version === undefined ? "report" : "report-revision",
      version === undefined ? id : `${id}:${Number(version)}`,
    );
    if (!revision || revision.conversationId !== conversationId)
      throw new HttpError(404, "Report not found.");
    return revision;
  }
  editReport(actor: string, conversationId: string, id: string, body: Record<string, unknown>) {
    const current = this.report(actor, conversationId, id);
    if (current.authorId !== actor) throw new HttpError(403, "Only the report author can edit its summary.");
    if (body.expectedVersion !== current.version)
      throw new HttpError(409, "Report changed. Fetch it again before saving.");
    const text = requireText(body.text);
    const message: Message = {
      id: randomUUID(), conversationId, senderId: actor,
      text: "Updated home problem report.", createdAt: new Date().toISOString(),
    };
    const revision = { ...current, version: current.version + 1, text,
      sourceMessageId: message.id, createdAt: message.createdAt };
    message.reportRef = this.store.reportReference(revision);
    this.store.transaction(() => {
      this.store.putReport(revision);
      this.store.put("message", message.id, message);
    });
    return { report: revision, message };
  }
  memory(actor: string, id: string, version?: unknown) {
    this.conversation(actor, id);
    if (version !== undefined) {
      if (!Number.isInteger(Number(version)) || Number(version) < 1)
        throw new HttpError(400, "Invalid memory version.");
      const snapshot = this.store.get<ConversationMemory>("memory-revision", `${id}:${Number(version)}`);
      if (!snapshot) throw new HttpError(404, "Memory version not found.");
      return snapshot;
    }
    return this.store.get<ConversationMemory>("memory", id) ?? emptyMemory(id);
  }
  saveMemory(actor: string, id: string, body: Record<string, unknown>) {
    const current = this.memory(actor, id);
    if (this.person(actor).role !== "support")
      throw new HttpError(403, "Only support can save conversation memory.");
    const memory = requireMemory(body, current, this.store.messages(id));
    this.store.transaction(() => {
      this.store.put("memory-revision", `${id}:${memory.version}`, memory);
      this.store.put("memory", id, memory);
    });
    return memory;
  }
  context(actor: string, id: string, options: { afterMessageId?: string; limit?: unknown } = {}) {
    const memory = this.memory(actor, id);
    const messages = this.store.messages(id);
    const checkpoint = messages.findIndex(m => m.id === memory.throughMessageId);
    let start = checkpoint + 1;
    if (options.afterMessageId) {
      const cursor = messages.findIndex(m => m.id === options.afterMessageId);
      if (cursor < checkpoint || cursor < 0) throw new HttpError(400, "Unknown or outdated context cursor.");
      start = cursor + 1;
    }
    const limit = requireLimit(options.limit, 10, 20);
    const pending = messages.slice(start, start + limit);
    // Reports carry their own editable text. The model fetches it only when needed.
    const compact = pending.map(({ attachments, text, ...message }) => ({
      ...message, ...(message.reportRef ? {} : { text }),
    }));
    const refs = new Map<string, NonNullable<Message["reportRef"]>>();
    // Retain a bounded discovery index for reports already covered by memory.
    for (const message of messages.slice(0, start + pending.length)) {
      if (message.reportRef) {
        refs.delete(message.reportRef.id);
        refs.set(message.reportRef.id, message.reportRef);
        if (refs.size > 20) refs.delete(refs.keys().next().value!);
      }
    }
    const hasMore = start + pending.length < messages.length;
    return { memory, recentMessages: compact, reports: [...refs.values()], hasMore,
      nextAfterMessageId: hasMore ? pending.at(-1)!.id : null };
  }
  attachment(actor: string, conversationId: string, id: string) {
    this.conversation(actor, conversationId);
    const media = this.store.media(conversationId, id);
    if (!media) throw new HttpError(404, "Attachment not found.");
    return media;
  }
}
