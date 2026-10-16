import { randomUUID } from "node:crypto";
import { Store, people } from "./store.ts";
import type {
  Attachment,
  AttachmentKind,
  Conversation,
  Message,
  Person,
} from "./types.ts";

const MiB = 1024 * 1024;
export const maxBytes: Record<AttachmentKind, number> = {
  image: 20 * MiB,
  audio: 30 * MiB,
  video: 100 * MiB,
};
const mimeTypes: Record<AttachmentKind, string[]> = {
  image: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
  ],
  audio: [
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "audio/aac",
    "audio/x-m4a",
    "audio/wav",
  ],
  video: ["video/mp4", "video/webm", "video/quicktime"],
};
// Who may send which media. Roles not listed send text only.
const allowedKinds: Partial<Record<Person["role"], AttachmentKind[]>> = {
  customer: ["image", "audio", "video"],
  support: ["audio"],
};
export const maxAttachmentsPerMessage = 4;

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
function optionalText(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.length > 4000)
    throw new HttpError(400, "Captions can be up to 4,000 characters.");
  return value.trim();
}
export type UploadPlan = {
  kind: AttachmentKind;
  mime: string;
  limit: number;
};
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
  /** Validates an upload before any bytes are read. */
  planUpload(actor: string, id: string, contentType: unknown): UploadPlan {
    this.conversation(actor, id);
    const mime =
      typeof contentType === "string"
        ? contentType.split(";")[0].trim().toLowerCase()
        : "";
    const kind = (Object.keys(mimeTypes) as AttachmentKind[]).find((k) =>
      mimeTypes[k].includes(mime),
    );
    if (!kind)
      throw new HttpError(
        415,
        "Send a photo, video or voice message in a supported format.",
      );
    if (!allowedKinds[this.person(actor).role]?.includes(kind))
      throw new HttpError(
        403,
        `You can't send ${kind} messages in this conversation.`,
      );
    return { kind, mime, limit: maxBytes[kind] };
  }
  saveUpload(
    actor: string,
    id: string,
    plan: UploadPlan,
    data: Uint8Array,
    meta: { name?: unknown; durationMs?: unknown },
  ): Attachment {
    if (!data.byteLength) throw new HttpError(400, "The file is empty.");
    const durationMs = Number(meta.durationMs);
    const attachment: Attachment = {
      id: randomUUID(),
      conversationId: id,
      uploaderId: actor,
      kind: plan.kind,
      mime: plan.mime,
      size: data.byteLength,
      ...(typeof meta.name === "string" && meta.name
        ? { name: meta.name.slice(0, 200) }
        : {}),
      ...(Number.isFinite(durationMs) && durationMs > 0
        ? { durationMs: Math.round(durationMs) }
        : {}),
      createdAt: new Date().toISOString(),
    };
    this.store.transaction(() => {
      this.store.putBlob(attachment.id, data);
      this.store.put("attachment", attachment.id, attachment);
    });
    return attachment;
  }
  attachment(actor: string, attachmentId: string) {
    const attachment = this.store.get<Attachment>("attachment", attachmentId);
    if (!attachment) throw new HttpError(404, "Attachment not found.");
    this.conversation(actor, attachment.conversationId);
    const data = this.store.getBlob(attachmentId);
    if (!data) throw new HttpError(404, "Attachment not found.");
    return { attachment, data };
  }
  send(
    actor: string,
    id: string,
    body: { text?: unknown; attachmentIds?: unknown },
  ): Message {
    this.conversation(actor, id);
    const ids = body.attachmentIds ?? [];
    if (
      !Array.isArray(ids) ||
      ids.length > maxAttachmentsPerMessage ||
      ids.some((a) => typeof a !== "string") ||
      new Set(ids).size !== ids.length
    )
      throw new HttpError(
        400,
        `Attach up to ${maxAttachmentsPerMessage} files.`,
      );
    if (!ids.length) {
      const message: Message = {
        id: randomUUID(),
        conversationId: id,
        senderId: actor,
        text: requireText(body.text),
        createdAt: new Date().toISOString(),
      };
      this.store.put("message", message.id, message);
      return message;
    }
    const text = optionalText(body.text);
    return this.store.transaction(() => {
      const messageId = randomUUID();
      const attachments = (ids as string[]).map((attachmentId) => {
        const a = this.store.get<Attachment>("attachment", attachmentId);
        if (
          !a ||
          a.conversationId !== id ||
          a.uploaderId !== actor ||
          a.messageId
        )
          throw new HttpError(
            400,
            "One of the attachments is no longer available. Remove it and try again.",
          );
        const linked = { ...a, messageId };
        this.store.put("attachment", a.id, linked);
        return linked;
      });
      const message: Message = {
        id: messageId,
        conversationId: id,
        senderId: actor,
        text,
        attachments,
        createdAt: new Date().toISOString(),
      };
      this.store.put("message", message.id, message);
      return message;
    });
  }
}
