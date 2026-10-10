import { HttpError } from "./errors.ts";
import type { ConversationMemory, MemoryItem, Message } from "./types.ts";

export function emptyMemory(conversationId: string): ConversationMemory {
  return { conversationId, version: 0, throughMessageId: null, facts: [], decisions: [], openQuestions: [], updatedAt: null };
}

// An LLM or trusted caller supplies semantic content. Storage validates size,
// provenance and checkpoint progression; it does not invent facts from messages.
export function requireMemory(
  body: Record<string, unknown>, current: ConversationMemory, messages: Message[],
): ConversationMemory {
  if (body.expectedVersion !== current.version)
    throw new HttpError(409, "Memory changed. Fetch it again before saving.");
  const checkpoint = messages.findIndex(m => m.id === body.throughMessageId);
  const previous = messages.findIndex(m => m.id === current.throughMessageId);
  if (checkpoint < 0 || checkpoint < previous)
    throw new HttpError(400, "Choose a valid checkpoint at or after the current checkpoint.");
  const covered = new Set(messages.slice(0, checkpoint + 1).map(m => m.id));
  let totalText = 0;
  let totalItems = 0;
  function items(value: unknown): MemoryItem[] {
    if (!Array.isArray(value)) throw new HttpError(400, "Memory sections must be arrays.");
    return value.map(item => {
      if (!item || typeof item !== "object" || Array.isArray(item) ||
          typeof item.text !== "string" || !item.text.trim() || item.text.length > 500 ||
          !Array.isArray(item.sourceMessageIds) || !item.sourceMessageIds.length ||
          item.sourceMessageIds.length > 5 ||
          item.sourceMessageIds.some((id: unknown) => typeof id !== "string" || !covered.has(id)))
        throw new HttpError(400, "Each memory item needs text and 1–5 source messages covered by the checkpoint.");
      totalText += item.text.length;
      totalItems++;
      if (totalText > 4000 || totalItems > 30)
        throw new HttpError(400, "Keep memory within 30 items and 4,000 characters.");
      return { text: item.text.trim(), sourceMessageIds: [...new Set<string>(item.sourceMessageIds)] };
    });
  }
  return {
    conversationId: current.conversationId, version: current.version + 1,
    throughMessageId: messages[checkpoint].id,
    facts: items(body.facts), decisions: items(body.decisions), openQuestions: items(body.openQuestions),
    updatedAt: new Date().toISOString(),
  };
}

export function requireLimit(value: unknown, fallback = 10, maximum = 100): number {
  const limit = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > maximum)
    throw new HttpError(400, `Limit must be between 1 and ${maximum}.`);
  return limit;
}
