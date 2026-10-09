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
const IMAGE_TYPES: Record<string, (b: Buffer) => boolean> = {
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  jpeg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP",
};
export const MAX_IMAGE = 2 * 1024 * 1024;
// T1: PNG/JPEG/WebP data URL, ≤ 2 MiB decoded, bytes must match the type.
export function requireImage(value: unknown): Message["image"] {
  if (value === undefined || value === null) return undefined;
  const v = value as { name?: unknown; dataUrl?: unknown };
  const match =
    typeof v.dataUrl === "string" &&
    v.dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match)
    throw new HttpError(400, "Only PNG, JPEG or WebP images are supported.");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_IMAGE)
    throw new HttpError(413, "Images must be 2 MiB or smaller.");
  if (!IMAGE_TYPES[match[1]](bytes))
    throw new HttpError(400, "Only PNG, JPEG or WebP images are supported.");
  const name = typeof v.name === "string" && v.name ? v.name.slice(0, 200) : "image";
  return { name, dataUrl: v.dataUrl as string };
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
        .filter((c) => c.participantIds.includes(actor))
        .map((c) => ({ ...c, unreadCount: this.unread(actor, c.id) })),
      blocked: people
        .filter((p) => this.isBlocked(p.id))
        .map((p) => p.id),
    };
  }
  // T4: read position is stored per person per conversation as a message index.
  unread(actor: string, id: string) {
    const read = this.store.get<number>("read", `${actor}:${id}`) ?? -1;
    return this.store
      .messages(id)
      .filter((m, i) => i > read && m.senderId !== actor).length;
  }
  markRead(actor: string, id: string, body: { throughMessageId?: unknown }) {
    this.conversation(actor, id);
    const index = this.store
      .messages(id)
      .findIndex((m) => m.id === body.throughMessageId);
    if (index < 0) throw new HttpError(400, "Unknown message.");
    const key = `${actor}:${id}`;
    if (index > (this.store.get<number>("read", key) ?? -1))
      this.store.put("read", key, index);
    return { unreadCount: this.unread(actor, id) };
  }
  view(m: Message): Message {
    const out = publicMessage(m);
    if (m.replyToId) {
      const src = this.store.get<Message>("message", m.replyToId);
      if (src) {
        const q = publicMessage(src);
        out.replyTo = {
          id: q.id,
          text: q.text,
          ...(q.image ? { image: q.image } : {}),
          ...(q.recalled ? { recalled: true } : {}),
        };
      }
    }
    return out;
  }
  messages(actor: string, id: string, q?: string | null) {
    this.conversation(actor, id);
    let list = this.store.messages(id).map((m) => this.view(m));
    // T8: literal, case-insensitive; recalled messages have no text so never match.
    if (q && q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((m) => !m.recalled && m.text.toLowerCase().includes(needle));
    }
    return list;
  }
  // T9: Alex's block list.
  isBlocked(proId: string) {
    return this.store.get<boolean>("block", proId) === true;
  }
  block(actor: string, proId: string, body: { blocked?: unknown }) {
    if (this.person(actor).role !== "customer")
      throw new HttpError(403, "Only the customer can block professionals.");
    const target = people.find((p) => p.id === proId);
    if (target?.role !== "professional")
      throw new HttpError(400, "Only professionals can be blocked.");
    if (typeof body.blocked !== "boolean")
      throw new HttpError(400, "blocked must be true or false.");
    this.store.put("block", proId, body.blocked);
    return { personId: proId, blocked: body.blocked };
  }
  // T10: customer invites support into a professional conversation.
  escalate(actor: string, id: string): Conversation {
    return this.store.transaction(() => {
      const c = this.conversation(actor, id);
      if (this.person(actor).role !== "customer" || !id.startsWith("pair-"))
        throw new HttpError(400, "Only Alex can invite support into a professional conversation.");
      if (c.participantIds.includes("support")) return c;
      const next = { ...c, participantIds: [...c.participantIds, "support"] };
      this.store.put("conversation", id, next);
      return next;
    });
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
      const { image: _img, ...kept } = message;
      const recalled = { ...kept, text: "", recalled: true };
      this.store.put("message", messageId, recalled);
      return publicMessage(recalled);
    });
  }
  // T7: clientMessageId identifies one send intent; retries return the original.
  send(
    actor: string,
    id: string,
    body: { text?: unknown; clientMessageId?: unknown; image?: unknown; replyToId?: unknown },
  ): { message: Message; created: boolean } {
    const conversation = this.conversation(actor, id);
    const image = requireImage(body.image);
    const text =
      image && (body.text === undefined || body.text === "" || body.text === null)
        ? ""
        : requireText(body.text);
    if (
      this.person(actor).role === "professional" &&
      conversation.participantIds.includes("customer") &&
      this.isBlocked(actor)
    )
      throw new HttpError(403, "Alex has blocked you. Your message was not delivered.");
    let replyToId: string | undefined;
    if (body.replyToId !== undefined && body.replyToId !== null) {
      const src =
        typeof body.replyToId === "string" &&
        this.store.get<Message>("message", body.replyToId);
      if (!src || src.conversationId !== id)
        throw new HttpError(400, "You can only quote a message in this conversation.");
      replyToId = src.id;
    }
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
          if (
            !existing.recalled &&
            (existing.text !== text || existing.image?.dataUrl !== image?.dataUrl)
          )
            throw new HttpError(409, "This send was already used for different text.");
          return { message: this.view(existing), created: false };
        }
      }
      const message: Message = {
        id: randomUUID(),
        conversationId: id,
        senderId: actor,
        text,
        createdAt: new Date().toISOString(),
        ...(clientId ? { clientMessageId: clientId as string } : {}),
        ...(image ? { image } : {}),
        ...(replyToId ? { replyToId } : {}),
      };
      this.store.put("message", message.id, message);
      if (key) this.store.put("intent", key, message.id);
      return { message: this.view(message), created: true };
    });
  }
}
export function publicMessage(m: Message): Message {
  if (!m.recalled) return { ...m };
  const { image: _drop, ...rest } = m;
  return { ...rest, text: "", recalled: true };
}
