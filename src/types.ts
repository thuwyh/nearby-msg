export type Person = {
  id: string;
  name: string;
  role: "customer" | "professional" | "support";
  description: string;
};
export type Conversation = {
  id: string;
  participantIds: string[];
  createdAt: string;
};
export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  reportRef?: ReportReference;
  attachments?: import("./media.ts").Attachment[];
  createdAt: string;
};
export type Fault = "none" | "before-save" | "after-save";

export type ReportReference = { id: string; version: number; description: string };
export type ReportRevision = {
  id: string;
  conversationId: string;
  version: number;
  authorId: string;
  text: string;
  report: import("./problems.ts").ProblemReport;
  attachments: import("./media.ts").Attachment[];
  sourceMessageId: string;
  createdAt: string;
};
export type MemoryItem = { text: string; sourceMessageIds: string[] };
export type ConversationMemory = {
  conversationId: string;
  version: number;
  throughMessageId: string | null;
  facts: MemoryItem[];
  decisions: MemoryItem[];
  openQuestions: MemoryItem[];
  updatedAt: string | null;
};
