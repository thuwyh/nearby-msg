# API notes

The UI is the product. Implement selected tasks end to end; UI-only mock results are not sufficient. The conventions below make it easy to review submissions, but you may change them and explain the mapping in your PR. Unselected task APIs need not exist.

## Starter

All `/api/*` requests use `X-Actor-Id`: `customer` (Alex), `pro-1` (Jordan), `pro-2` (Sam), or `support` (Nearby Support). These are trusted demo identities, not real authentication. A request must still be authorized for the chosen identity and conversation. Never accept a message's sender from the request body.

Initial state: one empty `support-thread` with participants `customer` and `support`. Professionals have no conversations. SQLite persists across restart. There are no seeded messages or automatic replies.

| Method / route | Body → response |
| --- | --- |
| `GET /health` | `{ok:true, exercise:"chat-v2"}` |
| `GET /api/state` | `{person, people, conversations}` — only the current actor's conversations |
| `GET /api/conversations/:id/messages` | `{messages}` — oldest first |
| `POST /api/conversations/:id/messages` | `{text}` → `{message}` (201) |
| `POST /api/dev/fault` | `{mode:"none"\|"before-save"\|"after-save"}` — one-shot fault for current actor |
| `POST /api/dev/reset` | `{}` → `{ok:true}` — resets chat data and faults; demo control only |

`Conversation`: `{id, participantIds, createdAt}`.

`Message`: `{id, conversationId, senderId, text, createdAt}`.

Text is trimmed, nonempty and at most 4,000 characters. Invalid input returns 400; inaccessible conversations return 404. Errors are JSON `{error: string}`. Unknown routes return 404.

`before-save` returns 503 without storing a message. `after-save` stores it, then returns 503 instead of confirmation. Both consume the fault once. The starter deliberately does not provide deduplication or a Retry action.

## Suggested extension conventions

Use these shapes if helpful. Equivalent implementations are valid; document changed routes or shapes so the reviewer can adapt their checks. The task descriptions define behavior, not a required implementation strategy.

| Task | Convention |
| --- | --- |
| T1 | Add `image: {name, dataUrl}` to message create/read; data URL contains persisted PNG/JPEG/WebP bytes, max 2 MiB decoded. You may instead use a file-upload endpoint. Text is optional when an image is present. |
| T2 | `POST /api/conversations {recipientId}` → `{conversation}`. Return the existing pair conversation if already created. |
| T3 | `POST /api/messages/:id/recall {}` → `{message}`. A recalled message has `recalled:true`, empty `text` and no image payload. Recall has no time limit. |
| T4 | Add `unreadCount` to each conversation in state. `POST /api/conversations/:id/read {throughMessageId}` records the last message actually viewed by this actor. |
| T5 | Accept `replyToId` on create; return `replyTo:{id,text,image?,recalled?}` on read. Derive the quote from its source message so recall can update it. |
| T6 | Local storage or server storage is fine. Key drafts by actor and conversation. No required API. Only text drafts are required. |
| T7 | Accept `clientMessageId` for a send intent and reuse it on retries. A fresh intentional send uses a new ID. A retry returns the existing message; conflicting content for the same intent is rejected. Keep the fault controls working. |
| T8 | `GET /api/conversations/:id/messages?q=...` returns literal, case-insensitive text matches in that conversation. The normal endpoint still returns history for jumping to a result. |
| T9 | `POST /api/people/:id/block {blocked:true\|false}`. The customer controls their own block list. A blocked professional's sends return 403. |
| T10 | `POST /api/conversations/:id/escalate {}` → `{conversation}`. Customer invites `support` into that conversation; repeated invitations are harmless. |

## Shared behavior

- Persist chat content, conversation membership, recall, read status and blocking when implementing those tasks. Drafts may stay browser-local.
- Identity and conversation boundaries apply to messages, search results, quotes, unread state and drafts. The platform has no special access to private messages until invited.
- Recall removes original content from subsequent API responses, including image payloads, quotes and search results when those features are implemented. Already seen or downloaded content cannot be undone.
- A recall marker remains in history. For unread counting, it occupies the same position as the original message; reading the conversation clears it normally.
- Block stops new inbound messages from that professional; it does not erase history, block support, or replay rejected messages after unblocking.
- T6, T9 and T10 depend on T2. Other tasks can use the existing customer–support conversation. Cross-feature checks apply only to features you implement together.
