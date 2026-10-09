import { randomUUID } from "node:crypto";
import { Store, people } from "./store.ts";
import type { Conversation, Message } from "./types.ts";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
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
  messages(actor: string, id: string) {
    this.conversation(actor, id);
    return this.store.messages(id).map(publicMessage);
  }
  // T2: one conversation per customer–professional pair.
  start(actor: string, body: { recipientId?: unknown }): Conversation {
    const me = this.person(actor);
    const other = people.find((p) => p.id === body.recipientId);
    const pair =
      me.role === "customer" && other?.role === "professional"
        ? [me.id, other.id]
        : me.role === "professional" && other?.role === "customer"
          ? [other.id, me.id]
          : null;
    if (!pair)
      throw new HttpError(400, "Customers can only message professionals.");
    const id = `pair-${pair[0]}-${pair[1]}`;
    return this.store.transaction(() => {
      const existing = this.store.get<Conversation>("conversation", id);
      if (existing) return existing;
      const conversation = {
        id,
        participantIds: pair,
        createdAt: new Date().toISOString(),
      };
      this.store.put("conversation", id, conversation);
      return conversation;
    });
  }
  // T3: only the sender can recall; content is wiped from storage.
  recall(actor: string, messageId: string): Message {
    return this.store.transaction(() => {
      const message = this.store.get<Message>("message", messageId);
      if (!message) throw new HttpError(404, "Message not found.");
      this.conversation(actor, message.conversationId);
      if (message.senderId !== actor)
        throw new HttpError(403, "You can only recall your own messages.");
      const recalled = { ...message, text: "", recalled: true };
      this.store.put("message", messageId, recalled);
      return publicMessage(recalled);
    });
  }
  // T7: clientMessageId identifies one send intent; retries return the original.
  send(
    actor: string,
    id: string,
    body: { text?: unknown; clientMessageId?: unknown },
  ): { message: Message; created: boolean } {
    this.conversation(actor, id);
    const text = requireText(body.text);
    const clientId = body.clientMessageId;
    if (
      clientId !== undefined &&
      (typeof clientId !== "string" || !clientId || clientId.length > 100)
    )
      throw new HttpError(400, "Invalid clientMessageId.");
    return this.store.transaction(() => {
      const key = clientId ? `${actor}:${id}:${clientId}` : null;
      if (key) {
        const existingId = this.store.get<string>("intent", key);
        const existing =
          existingId && this.store.get<Message>("message", existingId);
        if (existing) {
          if (!existing.recalled && existing.text !== text)
            throw new HttpError(409, "This send was already used for different text.");
          return { message: publicMessage(existing), created: false };
        }
      }
      const message: Message = {
        id: randomUUID(),
        conversationId: id,
        senderId: actor,
        text,
        createdAt: new Date().toISOString(),
        ...(clientId ? { clientMessageId: clientId as string } : {}),
      };
      this.store.put("message", message.id, message);
      if (key) this.store.put("intent", key, message.id);
      return { message: publicMessage(message), created: true };
    });
  }
}
export function publicMessage(m: Message): Message {
  return m.recalled ? { ...m, text: "", recalled: true } : m;
}
