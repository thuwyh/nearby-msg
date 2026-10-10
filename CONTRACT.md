# Starter API reference

This describes the existing starter, not a prescribed design for your solution. Extend or change the model and routes to fit your chosen scope, and document any changes needed to run or verify it.

## Demo identities

All `/api/*` requests use `X-Actor-Id`: `customer` (Alex), `pro-1` (Jordan), `pro-2` (Sam), or `support` (Nearby Support).

The switcher simulates identity, not production authentication. Requests still check conversation membership. The starter derives message senders from the chosen identity.

## Initial state

One empty `support-thread` with participants `customer` and `support`. Professionals have no conversations. SQLite persists across restart. There are no seeded messages or automatic replies.

`Conversation`: `{id, participantIds, createdAt}`.

`Message`: `{id, conversationId, senderId, text, createdAt}`.

## Existing routes

| Method / route                                         | Body → response                                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `GET /health`                                          | `{ok:true, exercise:"chat-v2"}`                                                         |
| `GET /api/state`                                       | `{person, people, conversations}` — only the current actor's conversations              |
| `GET /api/problem-schema`                              | `{version, common, categories, mediaLimits}` — shared guided-report question definition |
| `GET /api/conversations/:id/messages`                  | `{messages}` — oldest first                                                             |
| `POST /api/conversations/:id/messages`                 | `{text}` → `{message}` (201)                                                            |
| `GET /api/conversations/:id/attachments/:attachmentId` | Binary media — conversation membership required                                         |
| `POST /api/dev/fault`                                  | `{mode:"none"\|"before-save"\|"after-save"}` — one-shot fault for current actor         |
| `POST /api/dev/reset`                                  | `{}` → `{ok:true}` — resets chat data and faults                                        |

The current text endpoint trims text, accepts 1–4,000 characters, and limits a request to 24 MiB (including base64-encoded attachments). Invalid input returns 400; inaccessible conversations return 404. Errors are JSON `{error: string}`. Unknown routes return 404. These describe current implementation choices; you can revise them where your design requires it.

### Scenario 1 report extension

The message POST optionally accepts `report: {version: 1, categoryId, answers: {[questionId]: string}}` alongside the required `text`. Supported categories are `plumbing`, `walls`, `electrical`, and `other`. `location` and `observation` are required; other answers are optional. Each answer is limited to 500 characters on the server; the UI uses 300 to keep the generated message within the text limit. Optional common fields include `started`, `frequency`, `tried`, `severity`, and `notes`. Unknown category/version, missing required answers, non-string values, and question IDs outside the chosen category return 400. Only the customer role can submit reports (403 for other members); conversation membership is still required.

Messages with reports include `reportRef: {id, version, description}`. Fetch the artifact from the report endpoint below; its structured `report` contains `{version, category: {id, label}, fields: [{id, label, value}]}`. Labels are `[English, Chinese]` snapshots derived by the server, and fields contain only non-empty, trimmed answers. Existing text-only messages are unchanged. The editable `text` is an accompanying message; the report fields retain the answers confirmed in the review. Reports use the same SQLite persistence and before/after-save fault behavior as text messages.

### Photo and video attachments

A report send may also include `attachments: [{name, type, data}]`, where `data` is canonical base64 without a data-URL prefix. Supported types are `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, and `video/webm`. Up to 3 files are accepted, at most 8 MiB each and 16 MiB combined; names must be non-empty and at most 120 characters. Invalid types, content signatures, base64 or metadata return 400; size violations return 413. Non-empty attachments require a problem report.

Saved messages include `attachments: [{id, name, type, size}]`; bytes are stored separately as SQLite blobs in the same transaction. Message listing does not return the base64 data. Fetch bytes from `GET /api/conversations/:id/attachments/:attachmentId` with `X-Actor-Id`; inaccessible conversations and missing attachments return 404. Responses use the validated media content type and `nosniff`. The browser fetches authenticated blobs for previews/playback/download; there are no public attachment URLs. Reset clears saved bytes, and before-save faults do not create orphan media.

## Connection simulation

The UI's simulation controls affect the next send from the selected identity:

- `before-save`: returns 503 without saving the message.
- `after-save`: saves the message, then returns 503 instead of confirmation.
- `none`: normal behavior.

Each fault is consumed once. The starter has no automatic retry or send deduplication. Fault controls are available for development and demonstration.

## Persistence

`src/store.ts` stores JSON records and media blobs in SQLite. `CHAT_DB` sets the database path; the default is `.data/chat-v2.sqlite`. `PORT` sets the HTTP port; the default is 4310. Keep local data out of Git.

## Versioned reports and conversation memory

Raw message text and attachment metadata remain available in message history. Report bodies live in separate SQLite records. `reportRef.version` is an immutable revision number; `report.version` inside the artifact is the question schema version. Existing embedded reports are extracted transactionally on startup, preserving message IDs, text, timestamps, historical labels, attachment IDs, and bytes. Migration is idempotent.

| Method / route | Behavior |
| --- | --- |
| `GET /api/conversations/:id/reports/:reportId?version=1` | `{report}` containing ID, conversation ID, revision version, author ID, editable text, structured answers, attachment metadata, source message ID, and timestamp. Omit version for latest. |
| `POST /api/conversations/:id/reports/:reportId` | `{expectedVersion, text}` → `{report, message}` (201). Author only; stale version returns 409. Adds an immutable revision and a new message referencing it. Answers and attachments are preserved. |
| `GET /api/conversations/:id/memory` | `{memory}` with `version`, `throughMessageId`, `facts`, `decisions`, `openQuestions`, and timestamps. Initially version 0 with empty sections. Optional `?version=1` retrieves a saved snapshot. |
| `POST /api/conversations/:id/memory` | Support only: `{expectedVersion, throughMessageId, facts, decisions, openQuestions}` → `{memory}`. Stores a new snapshot and updates the current checkpoint atomically. |
| `GET /api/conversations/:id/context?limit=10` | `{memory, recentMessages, reports, hasMore, nextAfterMessageId}`. Compact model context, with no embedded report bodies, report summary text, attachment metadata, or media bytes. Ordinary text messages retain text. |

All these routes require conversation membership. Missing/inaccessible artifacts return 404. Each memory section is an array of `{text, sourceMessageIds}`. Total memory is limited to 30 items and 4,000 text characters, with at most 500 characters and 1–5 sources per item. Sources must belong to this conversation and fall at or before the checkpoint. Checkpoints cannot move backward; stale memory writes return 409. Validation checks provenance and size, not semantic accuracy.

The context endpoint returns the **first** pending messages after the checkpoint, oldest first (default 10, maximum 20), so a long unsummarized conversation is never silently truncated to its latest messages. Continue using `?afterMessageId=<nextAfterMessageId>&limit=10` until `hasMore` is false, or summarize each batch and advance the memory checkpoint. Cursors older than the current checkpoint return 400. `reports` is a bounded discovery index of up to 20 report references known through the returned batch. Older references remain available through raw history and sourced memory.

Raw history supports `GET /api/conversations/:id/messages?beforeMessageId=<id>&limit=10` (maximum 100), returning the preceding messages oldest first. Omit `beforeMessageId` to retrieve the latest limited page. Omitting both parameters preserves the full-history endpoint used by the demo UI.

A future LLM integration can wrap context, report, raw-history, and attachment endpoints as tools. Fetch reports by their referenced version for reproducibility; omit version when latest content is explicitly needed. Report edits append events after the memory checkpoint and thus become visible to the next context request. Tool responses consume model context when fetched. Only load media when the model needs to inspect it.

There is no LLM provider or automatic semantic summarization in this app. A trusted support caller submits compact memory snapshots after processing a batch, retaining material facts, corrections, decisions, and unresolved questions with message sources. Each snapshot is retained for inspection. Reset clears messages, report revisions, memory snapshots, and media. Summary edits do not consume the message-send simulation fault setting.
