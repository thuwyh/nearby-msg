import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Person, Conversation, Message } from "./types.ts";

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
      CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id));`);
    if (!this.get("meta", "initialized")) this.reset();
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
  reset(): void {
    this.transaction(() => {
      this.db.exec("DELETE FROM records");
      this.put("meta", "initialized", true);
      this.put<Conversation>("conversation", "support-thread", {
        id: "support-thread",
        participantIds: ["customer", "support"],
        createdAt: new Date().toISOString(),
      });
    });
  }
}
