# Nearby messaging exercise

**30 minutes. AI welcome. Choose your task order.**

Improve a messaging service for a home-services marketplace. The HTTP service, SQLite storage, simulated provider, clock and helpers are ready. No real messages or external accounts.

## Get the code

1. Fork [thuwyh/nearby-msg](https://github.com/thuwyh/nearby-msg).
2. Clone your fork and create a working branch.
3. Prepare your environment before the 30-minute coding period.

## Start

Use Node.js 24 or newer.

```sh
npm ci
npm run dev
```

API: http://127.0.0.1:4310 · simulated provider: http://127.0.0.1:4311.
Both addresses open a local guide with links to the task page and JSON inspection endpoints.
The API restarts when you edit source; provider state persists.

In a second terminal:

```sh
npm run cli -- reset
npm run cli -- event '{"id":"demo","type":"request.created","jobId":"job-1"}'
npm run cli -- tick
npm run cli -- records
```

## Work

Read [TASKS.md](TASKS.md) ([中文](TASKS.zh-CN.md)) and [CONTRACT.md](CONTRACT.md). Each task has a module in src/tasks. The module's implemented flag only labels unsupported policies; it does not determine your score. Update it when a policy works.

```sh
npm run typecheck
```

No tests or evaluation runner are provided. Design and implement your own tests and verification tools. A successful typecheck is not a correctness check.

Briefly state your priorities, then build and verify. You may refactor and add tests. You do not need to finish all ten tasks. At the end, demonstrate what works and call out remaining gaps.

## Map

- src/engine.ts: event → intention → decision → provider.
- src/tasks/: the ten tasks.
- src/store.ts: SQLite, transactions and consent history.
- src/helpers.ts: time, quota, bucketing and templates.
- src/fixtures.ts: independent scenarios; load with npm run cli -- reset T5.
- tools/simulator.mjs: inspectable local provider.

Only edit the exercise. Do not change the provider protocol or weaken the acceptance rules.

## Submit

Open a pull request from your fork to `thuwyh/nearby-msg` (`main`). Include:

- Tasks completed, partially completed and not attempted.
- Commands to run your tests, with observed results.
- Key decisions, known gaps and limitations.
- A brief note on how you used AI and verified its work.

Keep the HTTP and provider contracts compatible so the submission can be reviewed independently. Do not commit local data, credentials or dependencies.
