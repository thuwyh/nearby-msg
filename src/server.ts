import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Store } from "./store.ts";
import { Chat, HttpError } from "./chat.ts";
import type { Fault } from "./types.ts";

const store = new Store(process.env.CHAT_DB ?? ".data/chat-v2.sqlite");
const chat = new Chat(store);
const faults = new Map<string, Fault>();
const assets: Record<string, [string, string]> = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
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
    const upload = url.pathname.match(
      /^\/api\/conversations\/([^/]+)\/attachments$/,
    );
    if (upload && req.method === "POST") {
      const plan = chat.planUpload(
        actor,
        upload[1],
        req.headers["content-type"],
      );
      const chunks: Buffer[] = [];
      let size = 0;
      // Keep reading past the limit (discarding) so the client receives a clean 413.
      for await (const chunk of req as AsyncIterable<Buffer>) {
        size += chunk.length;
        if (size <= plan.limit) chunks.push(chunk);
      }
      if (size > plan.limit)
        throw new HttpError(
          413,
          `This ${plan.kind} is too large. The limit is ${plan.limit / 1024 / 1024} MB.`,
        );
      let name: string | undefined;
      try {
        const header = req.headers["x-file-name"];
        name =
          typeof header === "string" ? decodeURIComponent(header) : undefined;
      } catch {}
      const attachment = chat.saveUpload(
        actor,
        upload[1],
        plan,
        Buffer.concat(chunks),
        {
          name,
          durationMs: req.headers["x-duration-ms"],
        },
      );
      reply(201, { attachment });
      return;
    }
    const download = url.pathname.match(/^\/api\/attachments\/([^/]+)$/);
    if (download && req.method === "GET") {
      const { attachment, data } = chat.attachment(actor, download[1]);
      res.writeHead(200, {
        "Content-Type": attachment.mime,
        "Content-Length": data.byteLength,
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      });
      res.end(data);
      return;
    }
    let body: any = {};
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method ?? "")) {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 8 * 1024 * 1024)
          throw new HttpError(413, "Request too large.");
      }
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        throw new HttpError(400, "Invalid JSON.");
      }
      if (!body || Array.isArray(body) || typeof body !== "object")
        throw new HttpError(400, "Expected a JSON object.");
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
    const messages = url.pathname.match(
      /^\/api\/conversations\/([^/]+)\/messages$/,
    );
    if (messages && req.method === "GET") {
      reply(200, { messages: chat.messages(actor, messages[1]) });
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
const host = process.env.HOST ?? "127.0.0.1";
server.listen(Number(process.env.PORT ?? 4310), host, () =>
  console.log(`Nearby Chat · http://${host}:${process.env.PORT ?? 4310}`),
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
