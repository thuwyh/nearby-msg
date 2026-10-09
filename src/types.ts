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
  createdAt: string;
  clientMessageId?: string;
  recalled?: boolean;
};
export type Fault = "none" | "before-save" | "after-save";
