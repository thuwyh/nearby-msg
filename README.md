# Nearby Chat

A product engineering exercise: choose **one of three scenarios**, define a useful scope, and build a working version with AI. Coding time is at most **30 minutes**.

Alex has a leaking kitchen sink. Jordan and Sam are plumbers. Nearby Support is the platform's customer service team.

## Start

Use **Node.js 24 or newer**. Install and check the environment before the coding timer starts.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:4310**.

1. As **Customer**, send a text message to Nearby Support.
2. Switch to **Platform** to read and reply.
3. The **Professional** view switches between Jordan and Sam; they start without conversations.

The starter provides one empty customer–support conversation, text messaging, perspective switching and SQLite persistence. Use this as your starting point, and change the frontend and backend as needed.

## Scenario 1 · Guided home problem reports

Alex can describe plumbing, wall/patching, electrical, or other problems through a three-step flow:

1. As **Customer**, click **Describe a home problem**. Choose a category, location, and what you notice using quick options or your own words. Plumbing source options change for a sink, faucet, toilet, shower, or pipe. **Not sure** is a valid answer and offers a simple observation/photo suggestion.
2. Optionally add photos or short videos, when it started, when it happens, anything already tried, the impact/severity, and extra notes. All details on this step can be skipped with **Skip optional details**. Category-specific details such as wall damage size are included where relevant.
3. Review an automatically generated, editable message that incorporates the answers and mentions the actual attachments. **Back** changes answers; **Regenerate from answers** replaces an edited summary when requested. Preview or remove attachments before sending.
4. Switch to **Platform** to read the message, view photos/play videos, and reply with ordinary text. Refresh or restart to verify messages and media persist.

Only location and observations are required; both offer **Not sure**. All quick choices also allow custom text. Progress shows the current step. The interface and report labels support English and Chinese. Closing the form preserves answers and selected files in the current page; refresh, identity/conversation changes, and reset discard unsent drafts. Changing category removes its specific answers and suggestions while preserving custom common answers. Changing a plumbing fixture clears the previous source and usage timing. Leak-source questions are hidden for the preset blocked-drain and low-pressure observations.

### Attachments

Use JPEG, PNG, WebP, GIF, MP4, or WebM: up to **3 files**, **8 MiB per file**, and **16 MiB total**. The supplied `sample-assets/leaking-sink.png` and synthetic `tests/fixtures/short-video.webm` can demonstrate the flow. Videos are not transcoded; playback depends on browser codec support. Unsupported formats (including HEIC/SVG), mismatched content signatures, and oversized files are rejected with feedback. File-signature checks do not replace full media decoding or production malware scanning.

Message metadata and attachment bytes are saved together in a SQLite transaction when Alex sends, with no separate draft uploads. Viewing and downloading attachments requires conversation membership. Reset deletes media as well as messages. The existing database is extended automatically without clearing saved messages.

### Extending the flow

Add categories, questions, quick choices, dependencies, and summary wording in `src/problems.ts`. The frontend renders these definitions and the backend validates the answers. Summaries are deterministic: they use Alex's answers, preserve uncertainty, and do not infer a diagnosis. Saved reports snapshot the category, question labels, answers, and schema version, so later label changes do not rewrite historical reports. IDs must be unique within a report; breaking input changes require a schema version decision. Editing the generated message does not change the structured answers; use **Back** to edit those.

One problem per report and sharing with Support are supported. Professional conversation creation, offline draft storage, and duplicate-safe retries remain outside this scenario. An unconfirmed send may already have saved the message and attachments: check the chat before sending again. The simulation controls apply to report sends.

### Verification

```sh
npm test
npm run typecheck
# One-time browser setup for the optional UI checks:
npx playwright install chromium
npm run test:ui
```

The tests cover report validation, contextual choices and summary generation, attachment validation and size limits, transactional storage, conversation membership, ordinary messaging, fault behavior, restart persistence, and UTF-8 requests. Browser checks exercise quick selections, uncertainty, optional skips, photo/video previews and playback, attachment removal, editable/regenerated summaries, draft reopening, Support replies, Chinese labels, mobile layout, and a failed-send retry. All tests use isolated temporary databases.

## Choose your scenario

[Interview brief](https://nearby-messaging-interview.thrivingpanda.chatgpt.site/) · [English](TASKS.md) · [中文题面](TASKS.zh-CN.md)

Explain the user problem, ask questions, and choose your scope and interactions. Deliver one complete user flow, write your own checks, and explain your tradeoffs. You do not need to implement every possible feature.

Open a PR from your fork to `thuwyh/nearby-msg`. Include the selected scenario, your decisions, demo steps, verification and remaining gaps.

```sh
npm run typecheck
```

## Optional material

[sample-assets/leaking-sink.png](sample-assets/leaking-sink.png) is an AI-generated example photo (PNG, 1.87 MiB), available if it helps your chosen approach.

## Code map

| File               | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| `src/server.ts`    | HTTP routes, static files and one-shot connection faults     |
| `src/chat.ts`      | Membership checks and text messaging                         |
| `src/store.ts`     | SQLite records, four demo people, initial conversation       |
| `src/types.ts`     | Shared data types                                            |
| `src/media.ts`     | Attachment limits, type/signature validation                 |
| `src/problems.ts`  | Shared home problem categories, questions, report validation |
| `tools/workbench/` | Plain HTML/CSS/JavaScript interface                          |

[Starter API reference](CONTRACT.md) describes the code that is already provided. You can extend or change it; document changes needed to run or verify your submission.

## Local state

- Data is stored in `.data/chat-v2.sqlite` (ignored by Git). Refresh and server restart preserve it.
- **Reset demo** clears the chat database after confirmation.
- Simulation controls can fail the next send before saving or after saving but before confirmation. They affect only the current identity.
- `PORT` changes the HTTP port; `CHAT_DB` changes the database path.
- The identity switcher simulates people locally. Real sign-in, external accounts and production messaging are outside this exercise. The backend still checks conversation membership.

中文：从三个场景中任选一个，自行确定交互和实现范围，最多编码 30 分钟。先说明判断，再演示完整流程和验证结果。评估代码不在此仓库中，请自行编写检查。图片素材位于 `sample-assets/`，可按需使用。

## Conversation history and report revisions

Submitted reports are stored separately and referenced by ID and revision from chat messages. Click **Edit latest summary** on your report to save a new version; original messages, structured answers, and attachments remain available. Support can read revisions but cannot edit the customer's summary. Existing embedded reports migrate automatically on startup.

The backend also provides compact conversation memory with sourced facts, decisions, and open questions, saved as versioned checkpoints. `/api/conversations/:id/context` returns that memory plus a bounded batch of unsummarized messages and report references; report bodies and media are fetched separately. An LLM integration can use these endpoints as tools. Memory generation requires a trusted caller; this app does not yet connect to an LLM or summarize automatically. See [the API contract](CONTRACT.md#versioned-reports-and-conversation-memory) for payloads, pagination, access controls, and limits.

Run `npm test`, `npm run typecheck`, and `npm run test:ui` to verify storage, migration, revisions, context pagination, permissions, restart persistence, and browser flows.

[Implementation guide](docs/IMPLEMENTATION.md) explains the changes, message and report IDs, guided prompts, and the proposed LLM/tool-calling integration.
