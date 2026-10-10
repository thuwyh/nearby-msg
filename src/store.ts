import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Person, Conversation, Message, ReportRevision, ReportReference } from "./types.ts";
import type { ProblemReport } from "./problems.ts";
import type { SavedMedia } from "./media.ts";

export const people: Person[] = [
  {
    id: "customer",
    name: "Alex",
    role: "customer",
    description: "Needs help with a leaking kitchen sink",
  },
  {
    id: "pro-1",
    name: "Jordan",
    role: "professional",
    description: "Plumber · available today",
  },
  {
    id: "pro-2",
    name: "Sam",
    role: "professional",
    description: "Plumber · available tomorrow",
  },
  {
    id: "support",
    name: "Nearby Support",
    role: "support",
    description: "Platform customer service",
  },
];

export class Store {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id));
      CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, message_id TEXT NOT NULL, type TEXT NOT NULL, data BLOB NOT NULL);`);
    if (!this.get("meta", "initialized")) this.reset();
    this.migrateReports();
  }
  get<T>(kind: string, id: string): T | undefined {
    const row = this.db
      .prepare("SELECT data FROM records WHERE kind=? AND id=?")
      .get(kind, id);
    return row ? (JSON.parse(String(row.data)) as T) : undefined;
  }
  all<T>(kind: string): T[] {
    return this.db
      .prepare("SELECT data FROM records WHERE kind=? ORDER BY rowid")
      .all(kind)
      .map((r) => JSON.parse(String(r.data)) as T);
  }
  put<T>(kind: string, id: string, value: T): void {
    this.db
      .prepare(
        "INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data",
      )
      .run(kind, id, JSON.stringify(value));
  }
  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.db.exec("COMMIT");
      return value;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  conversations(): Conversation[] {
    return this.all<Conversation>("conversation");
  }
  messages(conversationId: string): Message[] {
    return this.all<Message>("message").filter(
      (m) => m.conversationId === conversationId,
    );
  }
  putReport(revision: ReportRevision): void {
    this.put("report-revision", `${revision.id}:${revision.version}`, revision);
    this.put("report", revision.id, revision);
  }
  reportReference(revision: ReportRevision): ReportReference {
    return {
      id: revision.id,
      version: revision.version,
      description: `${revision.report.category.label[0]} home problem report; ${revision.attachments.length} attachment(s)`,
    };
  }
  private migrateReports(): void {
    // Keep original text, timestamps and media IDs; only extract embedded artifacts.
    this.transaction(() => {
      for (const message of this.all<Message & { report?: ProblemReport }>("message")) {
        if (!message.report) continue;
        const revision: ReportRevision = {
          id: `report-${message.id}`, conversationId: message.conversationId,
          version: 1, authorId: message.senderId, text: message.text,
          report: message.report, attachments: message.attachments ?? [],
          sourceMessageId: message.id, createdAt: message.createdAt,
        };
        this.putReport(revision);
        const { report, ...raw } = message;
        this.put("message", message.id, { ...raw, reportRef: this.reportReference(revision) });
      }
    });
  }
  putMedia(conversationId: string, messageId: string, media: SavedMedia) {
    this.db
      .prepare("INSERT INTO media VALUES(?,?,?,?,?)")
      .run(media.id, conversationId, messageId, media.type, media.data);
  }
  media(conversationId: string, id: string) {
    const row = this.db
      .prepare("SELECT type, data FROM media WHERE conversation_id=? AND id=?")
      .get(conversationId, id);
    return row
      ? { type: String(row.type), data: Buffer.from(row.data as Uint8Array) }
      : undefined;
  }
  reset(): void {
    this.transaction(() => {
      this.db.exec("DELETE FROM records");
      this.db.exec("DELETE FROM media");
      this.put("meta", "initialized", true);
      this.put<Conversation>("conversation", "support-thread", {
        id: "support-thread",
        participantIds: ["customer", "support"],
        createdAt: new Date().toISOString(),
      });
    });
  }
}
