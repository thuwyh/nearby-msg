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
    return this.store.messages(id);
  }
  send(actor: string, id: string, body: { text?: unknown }): Message {
    this.conversation(actor, id);
    const message = {
      id: randomUUID(),
      conversationId: id,
      senderId: actor,
      text: requireText(body.text),
      createdAt: new Date().toISOString(),
    };
    this.store.put("message", message.id, message);
    return message;
  }
}
