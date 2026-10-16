// End-to-end checks for text + media messaging. Run with `npm run check`.
// Starts the real server on a random port with a throwaway database.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MiB = 1024 * 1024;
const port = 20000 + Math.floor(Math.random() * 20000);
const base = `http://127.0.0.1:${port}`;
const dir = mkdtempSync(join(tmpdir(), "nearby-check-"));
const db = join(dir, "chat.sqlite");
const photo = readFileSync(
  new URL("../sample-assets/leaking-sink.png", import.meta.url),
);
let server: ChildProcess;

async function start() {
  server = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    env: { ...process.env, PORT: String(port), CHAT_DB: db },
    stdio: "ignore",
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/health")).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Server did not start");
}
async function stop() {
  const exited = new Promise((r) => server.once("exit", r));
  server.kill("SIGTERM");
  await exited;
}
async function call(actor: string, path: string, body?: unknown) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "X-Actor-Id": actor },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
}
async function upload(
  actor: string,
  type: string,
  data: Uint8Array<ArrayBuffer>,
  headers: Record<string, string> = {},
) {
  const response = await fetch(
    base + "/api/conversations/support-thread/attachments",
    {
      method: "POST",
      headers: { "Content-Type": type, "X-Actor-Id": actor, ...headers },
      body: data,
    },
  );
  return { status: response.status, data: await response.json() };
}
const download = (actor: string, id: string) =>
  fetch(`${base}/api/attachments/${id}`, { headers: { "X-Actor-Id": actor } });
const messages = async (actor: string) =>
  (await call(actor, "/api/conversations/support-thread/messages")).data
    .messages;

before(start);
after(async () => {
  await stop();
  rmSync(dir, { recursive: true, force: true });
});

test("text messaging still works", async () => {
  const sent = await call(
    "customer",
    "/api/conversations/support-thread/messages",
    { text: "My kitchen sink is leaking" },
  );
  assert.equal(sent.status, 201);
  assert.equal(
    (await messages("support")).at(-1).text,
    "My kitchen sink is leaking",
  );
  const empty = await call(
    "customer",
    "/api/conversations/support-thread/messages",
    { text: "  " },
  );
  assert.equal(empty.status, 400);
});

test("customer sends a photo with a caption; support receives identical bytes", async () => {
  const up = await upload("customer", "image/png", photo, {
    "X-File-Name": encodeURIComponent("leaking-sink.png"),
  });
  assert.equal(up.status, 201);
  assert.equal(up.data.attachment.kind, "image");
  assert.equal(up.data.attachment.size, photo.byteLength);
  const sent = await call(
    "customer",
    "/api/conversations/support-thread/messages",
    {
      text: "Drip at the P-trap joint",
      attachmentIds: [up.data.attachment.id],
    },
  );
  assert.equal(sent.status, 201);
  const last = (await messages("support")).at(-1);
  assert.equal(last.text, "Drip at the P-trap joint");
  assert.equal(last.attachments[0].id, up.data.attachment.id);
  const file = await download("support", up.data.attachment.id);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), photo);
});

test("customer can send video and voice without text", async () => {
  for (const type of ["video/mp4", "audio/webm;codecs=opus"]) {
    const up = await upload("customer", type, new Uint8Array([1, 2, 3]), {
      "X-Duration-Ms": "4200",
    });
    assert.equal(up.status, 201, type);
    assert.equal(up.data.attachment.durationMs, 4200);
    const sent = await call(
      "customer",
      "/api/conversations/support-thread/messages",
      { attachmentIds: [up.data.attachment.id] },
    );
    assert.equal(sent.status, 201);
    assert.equal(sent.data.message.text, "");
  }
});

test("support can only send audio, and the customer can play it", async () => {
  assert.equal((await upload("support", "image/png", photo)).status, 403);
  assert.equal(
    (await upload("support", "video/mp4", new Uint8Array(4))).status,
    403,
  );
  const voice = new Uint8Array([9, 8, 7, 6]);
  const up = await upload("support", "audio/mp4", voice);
  assert.equal(up.status, 201);
  const sent = await call(
    "support",
    "/api/conversations/support-thread/messages",
    { attachmentIds: [up.data.attachment.id] },
  );
  assert.equal(sent.status, 201);
  const file = await download("customer", up.data.attachment.id);
  assert.equal(file.status, 200);
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), voice);
});

test("non-members cannot see or upload media", async () => {
  const id = (await messages("customer")).find((m: any) => m.attachments)
    .attachments[0].id;
  assert.equal((await download("pro-1", id)).status, 404);
  assert.equal(
    (await upload("pro-1", "audio/webm", new Uint8Array(4))).status,
    404,
  );
  assert.equal((await download("nobody", id)).status, 401);
});

test("rejects unsupported types, oversized files and misused attachments", async () => {
  assert.equal(
    (await upload("customer", "application/pdf", new Uint8Array(4))).status,
    415,
  );
  assert.equal(
    (await upload("customer", "image/jpeg", new Uint8Array(0))).status,
    400,
  );
  assert.equal(
    (await upload("customer", "image/jpeg", new Uint8Array(20 * MiB + 1)))
      .status,
    413,
  );
  assert.equal(
    (await upload("customer", "video/mp4", new Uint8Array(100 * MiB + 1)))
      .status,
    413,
  );
  assert.equal(
    (await upload("support", "audio/webm", new Uint8Array(30 * MiB + 1)))
      .status,
    413,
  );
  assert.equal(
    (await upload("support", "audio/webm", new Uint8Array(30 * MiB))).status,
    201,
  );
  assert.equal(
    (await upload("customer", "image/jpeg", new Uint8Array(20 * MiB))).status,
    201,
  );
  // An attachment can be used once, only by its uploader, in its own conversation.
  const linked = (await messages("customer")).find((m: any) => m.attachments)
    .attachments[0].id;
  const send = (actor: string, ids: unknown) =>
    call(actor, "/api/conversations/support-thread/messages", {
      attachmentIds: ids,
    });
  assert.equal((await send("customer", [linked])).status, 400);
  const theirs = await upload("customer", "audio/webm", new Uint8Array(4));
  assert.equal(
    (await send("support", [theirs.data.attachment.id])).status,
    400,
  );
  assert.equal((await send("customer", ["missing"])).status, 400);
  assert.equal((await send("customer", "nope")).status, 400);
  const five = [];
  for (let i = 0; i < 5; i++)
    five.push(
      (await upload("customer", "audio/webm", new Uint8Array(4))).data
        .attachment.id,
    );
  assert.equal((await send("customer", five)).status, 400);
  assert.equal((await send("customer", five.slice(0, 4))).status, 201);
});

test("media survives a restart and is cleared by reset", async () => {
  const before = await messages("customer");
  const id = before.find((m: any) => m.attachments).attachments[0].id;
  await stop();
  await start();
  assert.deepEqual(await messages("customer"), before);
  const file = await download("support", id);
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), photo);
  assert.equal((await call("customer", "/api/dev/reset", {})).status, 200);
  assert.equal((await download("customer", id)).status, 404);
  assert.deepEqual(await messages("customer"), []);
});
