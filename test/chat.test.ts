import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.ts";
import { Chat } from "../src/chat.ts";

const fresh = () => new Chat(new Store(":memory:"));
const status = (fn: () => unknown, code: number) =>
  assert.throws(fn, (e: any) => e.status === code);

test("T2: pair conversations are reused and private", () => {
  const chat = fresh();
  const a = chat.start("customer", { recipientId: "pro-1" });
  assert.equal(chat.start("customer", { recipientId: "pro-1" }).id, a.id);
  assert.equal(chat.start("pro-1", { recipientId: "customer" }).id, a.id);
  const b = chat.start("customer", { recipientId: "pro-2" });
  assert.notEqual(a.id, b.id);
  chat.send("pro-1", a.id, { text: "hi" });
  status(() => chat.messages("pro-2", a.id), 404);
  status(() => chat.messages("support", a.id), 404);
  assert.deepEqual(chat.state("pro-2").conversations.map((c) => c.id), [b.id]);
  status(() => chat.start("pro-1", { recipientId: "pro-2" }), 400);
});

test("T3: only sender recalls; content gone for everyone", () => {
  const chat = fresh();
  const { message } = chat.send("customer", "support-thread", { text: "wrong address" });
  chat.send("customer", "support-thread", { text: "after" });
  status(() => chat.recall("support", message.id), 403);
  const r = chat.recall("customer", message.id);
  assert.equal(r.recalled, true);
  const list = chat.messages("support", "support-thread");
  assert.equal(list[0].id, message.id);
  assert.equal(list[0].text, "");
  assert.ok(!JSON.stringify(chat.store.all("message")).includes("wrong address"));
  status(() => chat.recall("pro-1", message.id), 404);
});

test("T7: retries dedupe, intentional duplicates stay separate", () => {
  const chat = fresh();
  const first = chat.send("customer", "support-thread", { text: "ok", clientMessageId: "a" });
  const retry = chat.send("customer", "support-thread", { text: "ok", clientMessageId: "a" });
  assert.equal(first.created, true);
  assert.equal(retry.created, false);
  assert.equal(retry.message.id, first.message.id);
  chat.send("customer", "support-thread", { text: "ok", clientMessageId: "b" });
  assert.equal(chat.messages("support", "support-thread").length, 2);
  status(() => chat.send("customer", "support-thread", { text: "other", clientMessageId: "a" }), 409);
});

const png = (extra = 0) =>
  "data:image/png;base64," +
  Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(extra)]).toString("base64");

test("T1: images validated, text optional, recall drops image", () => {
  const chat = fresh();
  const { message } = chat.send("customer", "support-thread", { image: { name: "a.png", dataUrl: png() } });
  assert.equal(chat.messages("support", "support-thread")[0].image?.name, "a.png");
  status(() => chat.send("customer", "support-thread", { image: { name: "x.gif", dataUrl: "data:image/gif;base64,R0lG" } }), 400);
  status(() => chat.send("customer", "support-thread", { image: { name: "fake.png", dataUrl: "data:image/png;base64,aGVsbG8=" } }), 400);
  status(() => chat.send("customer", "support-thread", { image: { name: "big.png", dataUrl: png(2 * 1024 * 1024) } }), 413);
  chat.recall("customer", message.id);
  assert.equal(chat.messages("support", "support-thread")[0].image, undefined);
});

test("T4: unread per person, own messages excluded", () => {
  const chat = fresh();
  const pro = chat.start("customer", { recipientId: "pro-1" });
  chat.send("customer", "support-thread", { text: "mine" });
  const a = chat.send("support", "support-thread", { text: "1" }).message;
  chat.send("support", "support-thread", { text: "2" });
  chat.send("pro-1", pro.id, { text: "p" });
  const unread = (who: string, id: string) => chat.state(who).conversations.find((c) => c.id === id)!.unreadCount;
  assert.equal(unread("customer", "support-thread"), 2);
  chat.markRead("customer", "support-thread", { throughMessageId: a.id });
  assert.equal(unread("customer", "support-thread"), 1);
  assert.equal(unread("customer", pro.id), 1);
  assert.equal(unread("support", "support-thread"), 1);
});

test("T5 + T3: quotes same-conversation only and follow recall", () => {
  const chat = fresh();
  const pro = chat.start("customer", { recipientId: "pro-1" });
  const src = chat.send("support", "support-thread", { text: "secret" }).message;
  const other = chat.send("pro-1", pro.id, { text: "elsewhere" }).message;
  chat.send("customer", "support-thread", { text: "re", replyToId: src.id });
  status(() => chat.send("customer", "support-thread", { text: "x", replyToId: other.id }), 400);
  assert.equal(chat.messages("customer", "support-thread")[1].replyTo?.text, "secret");
  chat.recall("support", src.id);
  const q = chat.messages("customer", "support-thread")[1].replyTo!;
  assert.equal(q.recalled, true);
  assert.equal(q.text, "");
});

test("T8: search is scoped and skips recalled", () => {
  const chat = fresh();
  const pro = chat.start("customer", { recipientId: "pro-1" });
  const m = chat.send("customer", "support-thread", { text: "Leak under SINK" }).message;
  chat.send("customer", "support-thread", { text: "sink again" });
  chat.send("customer", pro.id, { text: "sink pro" });
  assert.equal(chat.messages("customer", "support-thread", "sink").length, 2);
  chat.recall("customer", m.id);
  assert.deepEqual(chat.messages("customer", "support-thread", "sink").map((x) => x.text), ["sink again"]);
});

test("T9: block rejects new pro messages only", () => {
  const chat = fresh();
  const a = chat.start("customer", { recipientId: "pro-1" });
  const b = chat.start("customer", { recipientId: "pro-2" });
  chat.send("pro-1", a.id, { text: "before" });
  status(() => chat.block("pro-2", "pro-1", { blocked: true }), 403);
  chat.block("customer", "pro-1", { blocked: true });
  status(() => chat.send("pro-1", a.id, { text: "blocked" }), 403);
  chat.send("pro-2", b.id, { text: "fine" });
  chat.send("customer", a.id, { text: "alex can still write" });
  chat.block("customer", "pro-1", { blocked: false });
  chat.send("pro-1", a.id, { text: "after" });
  assert.deepEqual(chat.messages("customer", a.id).map((x) => x.text), ["before", "alex can still write", "after"]);
});

test("T10: support sees only invited conversations", () => {
  const chat = fresh();
  const a = chat.start("customer", { recipientId: "pro-1" });
  const b = chat.start("customer", { recipientId: "pro-2" });
  chat.send("pro-1", a.id, { text: "history" });
  status(() => chat.messages("support", a.id), 404);
  status(() => chat.escalate("pro-1", a.id), 400);
  chat.escalate("customer", a.id);
  chat.escalate("customer", a.id);
  assert.deepEqual(chat.store.get<any>("conversation", a.id).participantIds, ["customer", "pro-1", "support"]);
  assert.equal(chat.messages("support", a.id)[0].text, "history");
  chat.send("support", a.id, { text: "help" });
  assert.equal(chat.messages("pro-1", a.id).length, 2);
  status(() => chat.messages("support", b.id), 404);
  status(() => chat.escalate("customer", "support-thread"), 400);
});
