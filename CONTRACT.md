# Behavior and API

These are exercise rules, not a statement of legal compliance. Use the fake clock. No real messages are sent.

## Shared rules

- Event identity: event ID plus identical payload. Intention identity: event ID, user ID, channel, purpose. Conflicting event reuse is HTTP 409.
- Email and SMS need separate affirmative consent. Missing consent means no permission. Global do-not-contact wins for both transactional and engagement messages.
- Check current consent immediately before every send. Never revive suppressed messages automatically. Already accepted messages cannot be recalled.
- accepted means the provider accepted a message; delivered is a later receipt. An unknown result is reconciling. Resolve unknown results before deciding to send again.
- now >= expiresAt is expired. Eligible time is the latest of schedule, retry time, quiet-hours end and quota reset. Expire if that time reaches the deadline.
- Engagement quiet hours: 21:00 inclusive to 08:00 exclusive, in the user's time zone. Cap: two accepted engagement messages per user per local calendar day, across all channels and campaigns. Transactional messages bypass only these two limits.
- Count acceptedAt, including acceptance recovered later. Failed attempts and duplicate receipts never add quota. Reconcile earlier uncertain acceptances before letting another engagement message use the remaining quota.
- For pending sends, primary reason order: global do-not-contact, missing channel consent, expiry, holdout, quiet hours, frequency cap, schedule, eligible. Accepted messages keep historical facts.
- Experiment buckets use the supplied SHA-256 helper and user ID plus experiment ID. Golden values can be generated from this published algorithm; 0–19 holdout, 20–59 A, 60–99 B. The service snapshot and retried content remain unchanged.
- Callback IDs identify events; provider sequence orders statuses for each provider message. A later sequence may correct a status. Same sequence/different content is a conflict.
- Demo identities: viewer-demo can read; operator-demo can request a retry. Trust the middleware identity, never a role in a JSON body. Manual requests retain the original attempt budget, key and schedule.
- Do not manually resend accepted, delivered, expired, suppressed, held_out, permanently failed or budget-exhausted messages. Temporary failures with remaining budget may be scheduled. Unknown outcomes may be looked up even when no sends remain.
- A preview is a read-only snapshot. Its totals use unique users; counts are grouped by decision action. It must report unimplemented policies and must not grant future permission.

## Provider protocol

POST /send with key, userId, channel and body returns a normalized result:
accepted (with message), temporary_failure, permanent_failure or unknown.

GET /lookup?key=... is strongly consistent and returns the accepted message or null.
Same key and same payload produces at most one provider message; a conflicting payload is rejected.

At most three send calls per intention. After the first and second temporary failures, retry after 60 and 120 seconds. Lookups do not consume this budget. Do not send after withdrawal; querying a historical outcome is still allowed.

Fault modes: accepted, temporary_failure, permanent_failure, before_timeout, after_timeout, after_pause. The last mode accepts then pauses the response until POST /release, to test a process crash.

Fixtures use ordinary America/Los_Angeles dates, not a DST transition. All stored timestamps are ISO UTC. One worker runs serially; distributed workers and arbitrary concurrent revocation races are out of scope.

## HTTP routes

JSON bodies. Read routes need no login; retry routes read x-api-key. The fixed tokens and /dev routes are local exercise tools, not a production auth design.

| Method | Path | Input |
| --- | --- | --- |
| GET | /health | clock and unsupported policies |
| GET | /messages | message list |
| GET | /messages/:id | message, attempts, receipts, audit |
| GET | /users | fixture users |
| GET | /audit | audit history |
| POST | /events | id, type, jobId |
| POST | /consent | userId and any of email, sms, dnc (booleans) |
| POST | /tick | {} |
| POST | /clock | now (ISO UTC, forward only; reset to move back) |
| POST | /receipts | id, providerId, sequence, status |
| POST | /preview | users, optional scheduledAt and experimentId |
| POST | /messages/:id/retry | requestId; header x-api-key |
| POST | /dev/reset | optional fixture: baseline or T1–T10 |
| POST | /dev/message | message fields to seed a scenario |
| POST | /dev/user | user fields |
| POST | /dev/job | id, customerId, providers, service |

Events: request.created → customer email now; provider.matched → professionals SMS now; job.completed → customer engagement email 24 hours later.

Provider control routes (port 4311): POST /fault with userId and modes; GET /records; POST /release. Reset and clock are synchronized by the application tools.

## Useful commands

```sh
npm run cli -- reset T5
npm run cli -- fault '{"userId":"customer","modes":["after_timeout"]}'
npm run cli -- tick
npm run cli -- clock 2026-10-15T17:01:00Z
npm run cli -- tick
npm run cli -- show m1
npm run cli -- records
```

Other commands: consent JSON, receipt JSON, preview JSON, retry ID REQUEST_ID.
Set LAB_KEY=viewer-demo to exercise viewer permission checks.

## Integration checks

If you implement related tasks, also verify: replayed matches; revoke then retry; accepted timeout then restart/revoke; quiet hours beyond expiry; cross-channel quota with holdout; preview then revoke; out-of-order receipts; direct viewer calls.

Build your own tests and verification tools. Final review checks the stated behavior and interactions among the tasks you claim to complete. Internal implementation choices are yours.
