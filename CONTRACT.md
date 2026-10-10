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

| Method / route | Body → response |
| --- | --- |
| `GET /health` | `{ok:true, exercise:"chat-v2"}` |
| `GET /api/state` | `{person, people, conversations}` — only the current actor's conversations |
| `GET /api/conversations/:id/messages` | `{messages}` — oldest first |
| `POST /api/conversations/:id/messages` | `{text}` → `{message}` (201) |
| `POST /api/dev/fault` | `{mode:"none"\|"before-save"\|"after-save"}` — one-shot fault for current actor |
| `POST /api/dev/reset` | `{}` → `{ok:true}` — resets chat data and faults |

The current text endpoint trims text, accepts 1–4,000 characters, and limits a request to 8 MiB. Invalid input returns 400; inaccessible conversations return 404. Errors are JSON `{error: string}`. Unknown routes return 404. These describe current implementation choices; you can revise them where your design requires it.

## Connection simulation

The UI's simulation controls affect the next send from the selected identity:

- `before-save`: returns 503 without saving the message.
- `after-save`: saves the message, then returns 503 instead of confirmation.
- `none`: normal behavior.

Each fault is consumed once. The starter has no automatic retry or send deduplication. Fault controls are available for development and demonstration.

## Persistence

`src/store.ts` stores JSON records in SQLite. `CHAT_DB` sets the database path; the default is `.data/chat-v2.sqlite`. `PORT` sets the HTTP port; the default is 4310. Keep local data out of Git.
