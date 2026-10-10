import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Store } from "./store.ts";
import { Chat, HttpError } from "./chat.ts";
import type { Fault } from "./types.ts";
import { problemSchema } from "./problems.ts";

const store = new Store(process.env.CHAT_DB ?? ".data/chat-v2.sqlite");
const chat = new Chat(store);
const faults = new Map<string, Fault>();
const assets: Record<string, [string, string]> = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/report.js": ["report.js", "text/javascript; charset=utf-8"],
  "/report-utils.js": ["report-utils.js", "text/javascript; charset=utf-8"],
  "/chat-media.js": ["chat-media.js", "text/javascript; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
};
const server = createServer(async (req, res) => {
  const reply = (status: number, data: unknown) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "GET" && assets[url.pathname]) {
      const [file, type] = assets[url.pathname];
      const content = await readFile(
        fileURLToPath(new URL("../tools/workbench/" + file, import.meta.url)),
      );
      res.writeHead(200, {
        "Content-Type": type,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(content);
      return;
    }
    if (req.method === "GET" && url.pathname === "/health") {
      reply(200, { ok: true, exercise: "chat-v2" });
      return;
    }
    const actor =
      typeof req.headers["x-actor-id"] === "string"
        ? req.headers["x-actor-id"]
        : "";
    chat.person(actor);
    let body: any = {};
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method ?? "")) {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        chunks.push(chunk);
        size += chunk.length;
        if (size > 24 * 1024 * 1024)
          throw new HttpError(413, "Request too large.");
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        throw new HttpError(400, "Invalid JSON.");
      }
      if (!body || Array.isArray(body) || typeof body !== "object")
        throw new HttpError(400, "Expected a JSON object.");
    }
    if (req.method === "GET" && url.pathname === "/api/problem-schema") {
      reply(200, problemSchema);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/state") {
      reply(200, chat.state(actor));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/dev/reset") {
      store.reset();
      faults.clear();
      reply(200, { ok: true });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/dev/fault") {
      if (!["none", "before-save", "after-save"].includes(body.mode))
        throw new HttpError(400, "Unknown failure mode.");
      faults.set(actor, body.mode);
      reply(200, { mode: body.mode });
      return;
    }
    const attachment = url.pathname.match(
      /^\/api\/conversations\/([^/]+)\/attachments\/([^/]+)$/,
    );
    if (attachment && req.method === "GET") {
      const media = chat.attachment(actor, attachment[1], attachment[2]);
      res.writeHead(200, {
        "Content-Type": media.type,
        "Content-Length": media.data.length,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(media.data);
      return;
    }
    const report = url.pathname.match(/^\/api\/conversations\/([^/]+)\/reports\/([^/]+)$/);
    if (report && req.method === "GET") {
      reply(200, { report: chat.report(actor, report[1], report[2], url.searchParams.get("version") ?? undefined) });
      return;
    }
    if (report && req.method === "POST") {
      reply(201, chat.editReport(actor, report[1], report[2], body));
      return;
    }
    const memory = url.pathname.match(/^\/api\/conversations\/([^/]+)\/memory$/);
    if (memory && req.method === "GET") {
      reply(200, { memory: chat.memory(actor, memory[1], url.searchParams.get("version") ?? undefined) });
      return;
    }
    if (memory && req.method === "POST") {
      reply(200, { memory: chat.saveMemory(actor, memory[1], body) });
      return;
    }
    const context = url.pathname.match(/^\/api\/conversations\/([^/]+)\/context$/);
    if (context && req.method === "GET") {
      reply(200, chat.context(actor, context[1], {
        afterMessageId: url.searchParams.get("afterMessageId") ?? undefined,
        limit: url.searchParams.get("limit") ?? undefined,
      }));
      return;
    }
    const messages = url.pathname.match(
      /^\/api\/conversations\/([^/]+)\/messages$/,
    );
    if (messages && req.method === "GET") {
      const paginated = url.searchParams.has("limit") || url.searchParams.has("beforeMessageId");
      reply(200, { messages: chat.messages(actor, messages[1], paginated ? {
        limit: url.searchParams.get("limit") ?? undefined,
        beforeMessageId: url.searchParams.get("beforeMessageId") ?? undefined,
      } : undefined) });
      return;
    }
    if (messages && req.method === "POST") {
      chat.conversation(actor, messages[1]);
      const fault = faults.get(actor);
      faults.delete(actor);
      if (fault === "before-save")
        throw new HttpError(
          503,
          "Connection failed before the message was saved.",
        );
      const message = chat.send(actor, messages[1], body);
      if (fault === "after-save")
        throw new HttpError(
          503,
          "Connection lost. The server saved the message, but the sender did not receive confirmation.",
        );
      reply(201, { message });
      return;
    }
    throw new HttpError(404, "Route not found.");
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    reply(e instanceof HttpError ? e.status : 500, {
      error: e instanceof HttpError ? e.message : "Unexpected server error.",
    });
  }
});
server.listen(Number(process.env.PORT ?? 4310), "127.0.0.1", () =>
  console.log(
    "Nearby Chat · http://127.0.0.1:" +
      (server.address() as { port: number }).port,
  ),
);
function stop() {
  server.close(() => {
    store.db.close();
    process.exit(0);
  });
  server.closeIdleConnections();
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
