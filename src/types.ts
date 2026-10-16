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
export type AttachmentKind = "image" | "audio" | "video";
export type Attachment = {
  id: string;
  conversationId: string;
  uploaderId: string;
  kind: AttachmentKind;
  mime: string;
  size: number;
  name?: string;
  durationMs?: number;
  messageId?: string;
  createdAt: string;
};
export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  attachments?: Attachment[];
  createdAt: string;
};
export type Fault = "none" | "before-save" | "after-save";
