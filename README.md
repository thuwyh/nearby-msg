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

Open **http://127.0.0.1:4310** for the web workbench. The simulated provider runs on port 4311.

- **Customer (Alex):** submit the plumbing request, manage consent, read delivered notifications.
- **Professional (Jordan / Sam):** switch identity to see each person's matched requests, preferences and inbox.
- **Platform:** select professionals for the request, mark service complete, dispatch messages, preview campaigns and investigate failures.
- A match is the platform's chosen recipient list, not a booking. No matching algorithm or job-acceptance flow is required.
- The **messaging gateway** is the email/SMS vendor simulated on port 4311, distinct from home-service professionals.
- Open a platform message to submit a delivery receipt or request a support retry. Inboxes show only backend messages marked delivered.
- Simulated time, reset and advanced event replay remain available. The request journey persists across restarts. Switch English / Chinese in the header.

The views and basic interactions are supplied. Edit the UI and backend as needed to deliver your chosen tasks end to end; no page redesign is required. Build your own tests. View switching is a local simulator control, not production authentication.

The workbench calls the same backend you are editing. It does not implement the tasks, evaluate correctness or replace your own tests. The starter may show missing or incorrect behavior; task requirements are in the separate brief.
The API restarts when you edit source; provider state persists.

The page resumes saved local state; a fresh clone starts with no submitted request or messages. Use **Start over** to clear the demo state without changing code. A selected professional is only a notification recipient; per-person notification status shows whether a message was actually created, sent or delivered.

**Consent** means a recipient’s permission to receive email or SMS from Nearby, not staff access permissions. Try this: submit Alex’s request, turn off **Allow email notifications** and save, then dispatch from Platform. T2 requires the queued email to be blocked. The starter may still send it; implementing this behavior is part of the exercise.

The CLI is optional. The same operations are available in the workbench. For terminal use:

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

- src/journey.ts: demo request lifecycle → existing event ingestion; no delivery policies.
- src/engine.ts: event → intention → decision → provider.
- src/tasks/: the ten tasks.
- src/store.ts: SQLite, transactions and consent history.
- src/helpers.ts: time, quota, bucketing and templates.
- src/fixtures.ts: independent scenarios; load with npm run cli -- reset T5.
- tools/simulator.mjs: inspectable local provider.
- tools/workbench/: browser controls and observation UI; no grading logic.

Only edit the exercise. Do not change the provider protocol or weaken the acceptance rules.

## Submit

Open a pull request from your fork to `thuwyh/nearby-msg` (`main`). Include:

- Tasks completed, partially completed and not attempted.
- Commands to run your tests, with observed results.
- Key decisions, known gaps and limitations.
- A brief note on how you used AI and verified its work.

Keep the HTTP and provider contracts compatible so the submission can be reviewed independently. Do not commit local data, credentials or dependencies.
