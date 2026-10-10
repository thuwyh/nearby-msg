import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { Store } from "../src/store.ts";
import { Chat, HttpError } from "../src/chat.ts";
import { problemSchema, requireReport } from "../src/problems.ts";

const report = (categoryId = "plumbing", extra = {}) => ({
  version: 1,
  categoryId,
  answers: {
    location: " Kitchen ",
    observation: "Water under the sink",
    ...extra,
  },
});
const badRequest = (fn: () => unknown) =>
  assert.throws(fn, (e: unknown) => e instanceof HttpError && e.status === 400);

test("every category accepts common observations; optional answers can be omitted", () => {
  for (const category of problemSchema.categories) {
    const result = requireReport(report(category.id));
    assert.equal(result.category.id, category.id);
    assert.equal(result.fields[0].value, "Kitchen");
    assert.equal(result.fields.length, 2);
  }
});
test("rejects invalid versions, categories, missing observations and unrelated fields", () => {
  badRequest(() => requireReport({ ...report(), version: 2 }));
  badRequest(() => requireReport(report("unknown")));
  badRequest(() => requireReport(report("walls", { observation: " " })));
  badRequest(() => requireReport(report("walls", { fixture: "sink" })));
  badRequest(() => requireReport(report("plumbing", { location: 42 })));
  badRequest(() => requireReport(report("other", { notes: "a".repeat(501) })));
  badRequest(() => requireReport({ ...report(), answers: [] }));
});
test("report labels are saved independently of later schema changes", () => {
  const result = requireReport(report());
  const label = problemSchema.categories[0].label[0];
  try {
    problemSchema.categories[0].label[0] = "Changed";
    assert.equal(result.category.label[0], label);
  } finally {
    problemSchema.categories[0].label[0] = label;
  }
});
test("text messaging works alongside reports and membership is enforced", () => {
  const store = new Store(":memory:");
  try {
    const chat = new Chat(store);
    chat.send("customer", "support-thread", { text: "Hello" });
    chat.send("customer", "support-thread", {
      text: "Please help",
      report: report(),
    });
    assert.equal(chat.messages("support", "support-thread").length, 2);
    assert.throws(
      () => chat.messages("pro-1", "support-thread"),
      (e: unknown) => e instanceof HttpError && e.status === 404,
    );
    assert.throws(
      () =>
        chat.send("support", "support-thread", {
          text: "Report",
          report: report(),
        }),
      (e: unknown) => e instanceof HttpError && e.status === 403,
    );
    badRequest(() =>
      chat.send("customer", "support-thread", { text: " ", report: report() }),
    );
    assert.equal(store.messages("support-thread").length, 2);
  } finally {
    store.db.close();
  }
});

test("HTTP reports survive restart, respect fault simulations, and preserve split UTF-8", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nearby-report-test-"));
  let child: ReturnType<typeof spawn> | undefined;
  async function start() {
    child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
      env: {
        ...process.env,
        PORT: "0",
        CHAT_DB: join(directory, "chat.sqlite"),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const url = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Server did not start: " + output)),
        10000,
      );
      child!.stdout!.on("data", (data) => {
        output += data;
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) {
          clearTimeout(timer);
          resolve(match[0]);
        }
      });
      child!.stderr!.on("data", (data) => {
        output += data;
      });
      child!.on("exit", (code) => {
        clearTimeout(timer);
        reject(new Error("Server exited: " + code + " " + output));
      });
    });
    return url;
  }
  async function stop() {
    if (child && child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
  }
  try {
    let url = await start();
    const api = async (path: string, body?: unknown, actor = "customer") => {
      const response = await fetch(url + path, {
        method: body === undefined ? "GET" : "POST",
        headers: { "X-Actor-Id": actor, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, data: await response.json() };
    };
    const path = "/api/conversations/support-thread/messages";
    assert.equal((await api("/api/problem-schema")).data.categories.length, 4);
    const send = {
      text: "Please help",
      report: report("walls", { damage: "hole", size: "palm-sized" }),
      attachments: [
        {
          name: "leaking-sink.png",
          type: "image/png",
          data: (
            await readFile(
              new URL("../sample-assets/leaking-sink.png", import.meta.url),
            )
          ).toString("base64"),
        },
      ],
    };
    assert.equal((await api(path, send)).status, 201);
    assert.equal((await api(path, undefined, "pro-1")).status, 404);
    await api("/api/dev/fault", { mode: "before-save" });
    assert.equal((await api(path, send)).status, 503);
    assert.equal((await api(path)).data.messages.length, 1);
    await api("/api/dev/fault", { mode: "after-save" });
    assert.equal((await api(path, send)).status, 503);
    assert.equal((await api(path)).data.messages.length, 2);
    const unicode = "水槽漏水 🔧";
    const bytes = Buffer.from(
      JSON.stringify({
        text: unicode,
        report: report("plumbing", { observation: unicode }),
      }),
    );
    const cut = bytes.indexOf(Buffer.from("水")) + 1;
    await new Promise<void>((resolve, reject) => {
      const req = request(
        url + path,
        {
          method: "POST",
          headers: {
            "X-Actor-Id": "customer",
            "Content-Type": "application/json",
          },
        },
        (res) => {
          let raw = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            raw += chunk;
          });
          res.on("end", () => {
            try {
              assert.equal(res.statusCode, 201);
              assert.equal(JSON.parse(raw).message.text, unicode);
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        },
      );
      req.on("error", reject);
      req.write(bytes.subarray(0, cut));
      setTimeout(() => req.end(bytes.subarray(cut)), 20);
    });
    let saved = (await api(path)).data.messages;
    const reportPath = "/api/conversations/support-thread/reports/" + saved[0].reportRef.id;
    assert.equal((await api(reportPath, undefined, "pro-1")).status, 404);
    const originalReport = (await api(reportPath + "?version=1")).data.report;
    assert.equal(originalReport.text, send.text);
    const memoryPath = "/api/conversations/support-thread/memory";
    const memoryInput = { expectedVersion: 0, throughMessageId: saved[0].id,
      facts: [{ text: "Customer submitted a wall damage report", sourceMessageIds: [saved[0].id] }],
      decisions: [], openQuestions: [] };
    assert.equal((await api(memoryPath, memoryInput)).status, 403);
    const memory = (await api(memoryPath, memoryInput, "support")).data.memory;
    assert.equal(memory.version, 1);
    const contextPath = "/api/conversations/support-thread/context";
    const context = (await api(contextPath + "?limit=1")).data;
    assert.equal(context.recentMessages[0].id, saved[1].id);
    assert.equal("text" in context.recentMessages[0], false);
    assert.equal(context.hasMore, true);
    assert.equal((await api(contextPath, undefined, "pro-1")).status, 404);
    assert.equal((await api(contextPath + "?limit=21")).status, 400);
    const edit = await api(reportPath, { expectedVersion: 1, text: "Edited wall report" });
    assert.equal(edit.status, 201);
    assert.equal(edit.data.report.version, 2);
    assert.equal((await api(reportPath, { expectedVersion: 1, text: "Stale edit" })).status, 409);
    saved = (await api(path)).data.messages;
    const attachmentPath =
      "/api/conversations/support-thread/attachments/" +
      saved[0].attachments[0].id;
    assert.equal(
      (
        await fetch(url + attachmentPath, {
          headers: { "X-Actor-Id": "pro-1" },
        })
      ).status,
      404,
    );
    await stop();
    url = await start();
    assert.deepEqual(
      (await api(path, undefined, "support")).data.messages,
      saved,
    );
    assert.equal((await api(reportPath)).data.report.text, "Edited wall report");
    assert.deepEqual((await api(reportPath + "?version=1")).data.report, originalReport);
    assert.deepEqual((await api(memoryPath)).data.memory, memory);
    const attachment = await fetch(url + attachmentPath, {
      headers: { "X-Actor-Id": "support" },
    });
    assert.equal(attachment.status, 200);
    assert.equal(attachment.headers.get("content-type"), "image/png");
    assert.deepEqual(
      Buffer.from(await attachment.arrayBuffer()),
      Buffer.from(send.attachments[0].data, "base64"),
    );
    await api("/api/dev/reset", {});
    assert.equal(
      (
        await fetch(url + attachmentPath, {
          headers: { "X-Actor-Id": "customer" },
        })
      ).status,
      404,
    );
  } finally {
    await stop();
    await rm(directory, { recursive: true, force: true });
  }
});
