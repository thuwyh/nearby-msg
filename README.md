# Nearby Chat

A small home-services chat app for a 30-minute, AI-assisted coding exercise.

Alex is a customer with a leaking kitchen sink. Jordan and Sam are plumbers. Nearby Support is the platform’s customer service team.

## Start

Use **Node.js 24 or newer**. Install and check your environment before the coding timer starts.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:4310**. Only this port is needed.

1. As **Customer**, send a message to Nearby Support.
2. Switch to **Platform** to read and reply.
3. Switch back to see the reply. The **Professional** view switches between Jordan and Sam; they start without conversations.

The starter has one **empty** customer–support conversation, text messaging, perspective switching and persistent SQLite storage. The ten requested features are not implemented. No messages are sent outside this machine.

## Your work

[Interview brief](https://nearby-messaging-interview.thrivingpanda.chatgpt.site/) · [Tasks](TASKS.md) · [中文题面](TASKS.zh-CN.md)

Choose tasks and change the frontend and backend as needed. You do not need to finish everything. Build your own tests. Open a PR from your fork to `thuwyh/nearby-msg`; include task IDs, how to try your changes, test commands/results and remaining gaps.

```sh
npm run typecheck
```

## Code map

| File | Purpose |
| --- | --- |
| `src/server.ts` | HTTP routes, static files and one-shot connection faults |
| `src/chat.ts` | Membership checks and text messaging |
| `src/store.ts` | SQLite records, four demo people, empty initial conversation |
| `src/types.ts` | Shared data types |
| `tools/workbench/` | Plain HTML/CSS/JavaScript interface |

[API notes](CONTRACT.md) describe existing routes and suggested extension conventions. No framework or architecture change is required. If you change the API conventions, document the mapping in your PR.

## Local state

- Data is stored in `.data/chat-v2.sqlite` (ignored by Git). Reloads and server restarts preserve it.
- **Reset demo** clears this chat database after confirmation.
- Simulation controls can fail the next send before saving or after saving but before returning confirmation. They affect only the current identity.
- `PORT` changes the HTTP port; `CHAT_DB` changes the database path.
- The identity switcher is a local simulation, not production authentication. The backend still checks conversation membership. Do not add real accounts or external services.

中文：这是本地聊天模拟器。先以用户身份向客服发送文字，再切换平台回复。十个功能由你选择实现；评估代码不在此仓库中，请自行编写测试。所有数据保存在本地，旧版通知模拟器的数据不会被读取。
