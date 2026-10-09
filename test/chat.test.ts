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
