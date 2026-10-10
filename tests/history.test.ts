import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.ts";
import { Chat, HttpError } from "../src/chat.ts";
import { requireReport } from "../src/problems.ts";
import type { ConversationMemory } from "../src/types.ts";

const input = { version: 1, categoryId: "plumbing", answers: { location: "Kitchen", observation: "Leak under sink" } };
const status = (code: number) => (error: unknown) => error instanceof HttpError && error.status === code;

test("reports have immutable revisions, private retrieval and optimistic edits", () => {
  const store = new Store(":memory:");
  try {
    const chat = new Chat(store);
    const original = chat.send("customer", "support-thread", { text: "Original summary", report: input });
    const id = original.reportRef!.id;
    assert.equal("report" in original, false);
    assert.equal(chat.report("support", "support-thread", id).text, "Original summary");
    assert.throws(() => chat.report("pro-1", "support-thread", id), status(404));
    assert.throws(() => chat.report("customer", "support-thread", id, 99), status(404));
    assert.throws(() => chat.report("customer", "support-thread", id, "bad"), status(400));
    assert.throws(() => chat.editReport("support", "support-thread", id, { expectedVersion: 1, text: "Edited" }), status(403));
    const edit = chat.editReport("customer", "support-thread", id, { expectedVersion: 1, text: "Corrected summary" });
    assert.equal(edit.report.version, 2);
    assert.equal(edit.message.reportRef!.id, id);
    assert.equal(chat.report("support", "support-thread", id, 1).text, "Original summary");
    assert.equal(chat.report("support", "support-thread", id).text, "Corrected summary");
    assert.deepEqual(store.messages("support-thread")[0], original);
    assert.deepEqual(edit.report.report, requireReport(input));
    assert.throws(() => chat.editReport("customer", "support-thread", id, { expectedVersion: 1, text: "Stale" }), status(409));
    assert.equal(store.messages("support-thread").length, 2);
    store.reset();
    assert.throws(() => chat.report("customer", "support-thread", id), status(404));
    assert.equal(store.all("report-revision").length, 0);
  } finally { store.db.close(); }
});

test("memory preserves sourced snapshots and context never skips unsummarized messages", () => {
  const store = new Store(":memory:");
  try {
    const chat = new Chat(store);
    const first = chat.send("customer", "support-thread", { text: "My sink leaks" });
    const report = chat.send("customer", "support-thread", { text: "Full editable summary", report: input });
    const later = chat.send("support", "support-thread", { text: "When does it happen?" });
    const body = { expectedVersion: 0, throughMessageId: first.id,
      facts: [{ text: "Customer reports a sink leak", sourceMessageIds: [first.id] }], decisions: [], openQuestions: [] };
    assert.throws(() => chat.saveMemory("customer", "support-thread", body), status(403));
    assert.throws(() => chat.saveMemory("pro-1", "support-thread", body), status(404));
    assert.throws(() => chat.saveMemory("support", "support-thread", { ...body, facts: [{ text: "Future", sourceMessageIds: [later.id] }] }), status(400));
    const memory = chat.saveMemory("support", "support-thread", body);
    assert.equal(memory.version, 1);
    assert.throws(() => chat.saveMemory("support", "support-thread", body), status(409));
    const context = chat.context("support", "support-thread", { limit: 1 });
    assert.equal(context.recentMessages[0].id, report.id);
    assert.equal("text" in context.recentMessages[0], false);
    assert.equal("attachments" in context.recentMessages[0], false);
    assert.equal("report" in context.recentMessages[0], false);
    assert.equal(context.reports[0].id, report.reportRef!.id);
    assert.equal(context.hasMore, true);
    const next = chat.context("support", "support-thread", { limit: 1, afterMessageId: context.nextAfterMessageId! });
    assert.equal(next.recentMessages[0].text, "When does it happen?");
    assert.equal(next.hasMore, false);
    const updated = chat.saveMemory("support", "support-thread", { ...body, expectedVersion: 1, throughMessageId: later.id });
    assert.equal(updated.version, 2);
    assert.deepEqual(store.get<ConversationMemory>("memory-revision", "support-thread:1"), memory);
    assert.deepEqual(chat.memory("support", "support-thread", 1), memory);
    assert.throws(() => chat.memory("support", "support-thread", 99), status(404));
    assert.equal(chat.context("support", "support-thread").recentMessages.length, 0);
    assert.equal(chat.context("support", "support-thread").reports[0].id, report.reportRef!.id);
    assert.throws(() => chat.saveMemory("support", "support-thread", { ...body, expectedVersion: 2 }), status(400));
    assert.throws(() => chat.context("support", "support-thread", { afterMessageId: first.id }), status(400));
    assert.throws(() => chat.context("support", "support-thread", { limit: 21 }), status(400));
    assert.throws(() => chat.saveMemory("support", "support-thread", { ...body, expectedVersion: 2, throughMessageId: later.id, facts: Array(31).fill(body.facts[0]) }), status(400));
    for (let i = 0; i < 25; i++) chat.send("support", "support-thread", { text: `Message ${i}` });
    assert.equal(chat.context("support", "support-thread").recentMessages.length, 10);
    assert.equal(chat.messages("support", "support-thread", { beforeMessageId: later.id, limit: 1 })[0].id, report.id);
    store.reset();
    assert.equal(chat.memory("support", "support-thread").version, 0);
    assert.equal(store.all("memory-revision").length, 0);
  } finally { store.db.close(); }
});

test("legacy reports migrate once and preserve original messages and media across restart", () => {
  const directory = mkdtempSync(join(tmpdir(), "nearby-history-"));
  const path = join(directory, "chat.sqlite");
  let store = new Store(path);
  try {
    const legacy = { id: "old-message", conversationId: "support-thread", senderId: "customer",
      text: "Original wording", createdAt: "2026-01-01T00:00:00.000Z", report: requireReport(input),
      attachments: [{ id: "old-photo", name: "photo.png", type: "image/png", size: 3 }] };
    store.put("message", legacy.id, legacy);
    store.putMedia("support-thread", legacy.id, { ...legacy.attachments[0], data: Buffer.from([1, 2, 3]) });
    store.db.close();
    store = new Store(path);
    const chat = new Chat(store);
    const migrated = chat.messages("support", "support-thread")[0];
    assert.equal(migrated.text, legacy.text);
    assert.equal(migrated.createdAt, legacy.createdAt);
    assert.deepEqual(migrated.attachments, legacy.attachments);
    const id = migrated.reportRef!.id;
    const edit = chat.editReport("customer", "support-thread", id, { expectedVersion: 1, text: "Edited wording" });
    const memory = chat.saveMemory("support", "support-thread", { expectedVersion: 0, throughMessageId: edit.message.id, facts: [], decisions: [], openQuestions: [] });
    store.db.close();
    store = new Store(path);
    const restarted = new Chat(store);
    assert.equal(restarted.report("support", "support-thread", id).text, "Edited wording");
    assert.equal(restarted.report("support", "support-thread", id, 1).text, legacy.text);
    assert.deepEqual(restarted.memory("support", "support-thread"), memory);
    assert.deepEqual(restarted.attachment("support", "support-thread", "old-photo").data, Buffer.from([1, 2, 3]));
    assert.equal(store.all("report-revision").length, 2);
    assert.deepEqual(restarted.messages("support", "support-thread")[0], migrated);
  } finally { store.db.close(); rmSync(directory, { recursive: true, force: true }); }
});
