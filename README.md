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

| File | Purpose |
| --- | --- |
| `src/server.ts` | HTTP routes, static files and one-shot connection faults |
| `src/chat.ts` | Membership checks and text messaging |
| `src/store.ts` | SQLite records, four demo people, initial conversation |
| `src/types.ts` | Shared data types |
| `tools/workbench/` | Plain HTML/CSS/JavaScript interface |

[Starter API reference](CONTRACT.md) describes the code that is already provided. You can extend or change it; document changes needed to run or verify your submission.

## Local state

- Data is stored in `.data/chat-v2.sqlite` (ignored by Git). Refresh and server restart preserve it.
- **Reset demo** clears the chat database after confirmation.
- Simulation controls can fail the next send before saving or after saving but before confirmation. They affect only the current identity.
- `PORT` changes the HTTP port; `CHAT_DB` changes the database path.
- The identity switcher simulates people locally. Real sign-in, external accounts and production messaging are outside this exercise. The backend still checks conversation membership.

中文：从三个场景中任选一个，自行确定交互和实现范围，最多编码 30 分钟。先说明判断，再演示完整流程和验证结果。评估代码不在此仓库中，请自行编写检查。图片素材位于 `sample-assets/`，可按需使用。
