# Starter API reference

This describes the existing starter, not a prescribed design for your solution. Extend or change the model and routes to fit your chosen scope, and document any changes needed to run or verify it.

## Demo identities

All `/api/*` requests use `X-Actor-Id`: `customer` (Alex), `pro-1` (Jordan), `pro-2` (Sam), or `support` (Nearby Support).

The switcher simulates identity, not production authentication. Requests still check conversation membership. The starter derives message senders from the chosen identity.

## Initial state

One empty `support-thread` with participants `customer` and `support`. Professionals have no conversations. SQLite persists across restart. There are no seeded messages or automatic replies.

`Conversation`: `{id, participantIds, createdAt}`.

`Message`: `{id, conversationId, senderId, text, attachments?, createdAt}`. `text` may be `""` when the message has attachments.

`Attachment`: `{id, conversationId, uploaderId, kind: "image"|"audio"|"video", mime, size, name?, durationMs?, messageId?, createdAt}`. Messages embed attachment metadata; bytes are fetched separately.

## Existing routes

| Method / route | Body → response |
| --- | --- |
| `GET /health` | `{ok:true, exercise:"chat-v2"}` |
| `GET /api/state` | `{person, people, conversations}` — only the current actor's conversations |
| `GET /api/conversations/:id/messages` | `{messages}` — oldest first |
| `POST /api/conversations/:id/messages` | `{text?, attachmentIds?}` → `{message}` (201) |
| `POST /api/conversations/:id/attachments` | Raw file body, `Content-Type` = media type, optional `X-File-Name` (URI-encoded) and `X-Duration-Ms` → `{attachment}` (201), not yet linked to a message |
| `GET /api/attachments/:id` | File bytes with the stored `Content-Type` — only for members of the attachment's conversation |
| `POST /api/dev/fault` | `{mode:"none"\|"before-save"\|"after-save"}` — one-shot fault for current actor |
| `POST /api/dev/reset` | `{}` → `{ok:true}` — resets chat data and faults |

The text endpoint trims text, accepts 1–4,000 characters, and limits a JSON request to 8 MiB. A message needs text or 1–4 attachments; each attachment must be uploaded by the sender to the same conversation and can be used once (otherwise 400). Invalid input returns 400; inaccessible conversations return 404. Errors are JSON `{error: string}`. Unknown routes return 404. These describe current implementation choices; you can revise them where your design requires it.

## Media messages

| Kind | Types | Limit | Who can send |
| --- | --- | --- | --- |
| image | jpeg, png, webp, gif, heic/heif | 20 MiB | customer |
| audio | webm, ogg, mp4/m4a, mpeg, aac, wav | 30 MiB | customer, support |
| video | mp4, webm, quicktime | 100 MiB | customer |

Unsupported type → 415, role not allowed → 403, over the limit → 413, empty file → 400. Professionals stay text-only for now. Files are stored as BLOBs in the same SQLite database, so they survive restart and are removed by reset.

The UI uploads each file as soon as it is added (with progress), then sends the message with the attachment ids. Voice: hold 🎤 to talk and release to send (move away to cancel), or tap to record and review before sending. Photo/video: "Take/Record" opens the phone camera via `capture`, or an in-page camera on desktop; "Upload" opens the file picker. Photos are downscaled to ≤2048 px JPEG in the browser before upload. Where the microphone or camera isn't available (for example a phone over plain `http`), the UI falls back to the device's own recorder/file picker.

## Connection simulation

The UI's simulation controls affect the next send from the selected identity:

- `before-save`: returns 503 without saving the message.
- `after-save`: saves the message, then returns 503 instead of confirmation.
- `none`: normal behavior.

Each fault is consumed once. The starter has no automatic retry or send deduplication. Fault controls are available for development and demonstration.

## Persistence

`src/store.ts` stores JSON records in SQLite. `CHAT_DB` sets the database path; the default is `.data/chat-v2.sqlite`. `PORT` sets the HTTP port; the default is 4310. `HOST` sets the bind address; the default is `127.0.0.1` (use `HOST=0.0.0.0` to open it from a phone on the same network). Keep local data out of Git.
