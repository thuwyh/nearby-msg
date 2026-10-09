# Tasks

30 minutes. Choose your order. AI tools are welcome. Each task has two acceptance groups, worth half its stated weight. You do not need to finish everything.

## T1 Route matched requests (6 points)

Notify every matched professional, once, by SMS.

File: src/tasks/t1-routing.ts

- A: Use the matched professionals and the supplied service template. Do not notify unrelated users.
- B: Deduplicate recipient IDs. Reject missing recipient or service data without partial writes.

## T2 Honor current consent (12 points)

A withdrawal must affect queued messages and retries.

File: src/tasks/t2-consent.ts

- A: Require consent for the selected channel. Global do-not-contact overrides every message purpose.
- B: Recheck before each send and record the consent revision. Never resurrect suppressed messages or rewrite an accepted send.

## T3 Deduplicate incoming events (10 points)

Upstream retries should not create extra message intentions.

File: src/tasks/t3-dedup.ts

- A: Replay the same event ID and payload with the same result. Reject reuse of that ID with different data.
- B: Persist the decision across restarts. Keep distinct recipients, channels and purposes separate.

## T4 Respect schedules and expiry (8 points)

Send neither too early nor after a message loses its value.

File: src/tasks/t4-schedule.ts

- A: Honor scheduledAt and nextAt. At or after expiresAt, expire without sending.
- B: If the earliest eligible time reaches expiry, do not catch up later. Use the supplied clock, including after restart.

## T5 Recover uncertain sends (14 points)

A timeout does not tell you whether a message was accepted.

File: src/tasks/t5-recovery.ts

- A: Retry temporary failures after 60 and 120 seconds; at most three send calls. Do not retry permanent failures.
- B: Recover both timeout modes and process restarts using persistent identity. Produce at most one provider message. After withdrawal, lookup is allowed; another send is not.

## T6 Share send limits (12 points)

Protect people from late-night messages and overlapping campaigns.

File: src/tasks/t6-limits.ts

- A: Defer engagement messages during local 21:00–08:00. Transactional messages are exempt from quiet hours and engagement caps.
- B: Across channels and campaigns, accept at most two engagement messages per user per local day. Failed attempts, holdout and duplicate receipts do not consume quota. Combine limits with scheduling and expiry.

## T7 Handle duplicate and late receipts (8 points)

Project delivery status by provider sequence, not arrival order.

File: src/tasks/t7-receipts.ts

- A: Replay identical callbacks without applying them again. Preserve the valid event history.
- B: Use the highest sequence. Reject conflicting same-ID/same-sequence content and unknown provider message IDs without overwriting current status.

## T8 Add a stable holdout (6 points)

Keep experiment assignments consistent across a user's messages.

File: src/tasks/t8-experiment.ts

- A: Use bucket(userId, experimentId): 0–19 holdout, 20–59 template A, 60–99 template B. Keep assignments stable across events and restarts.
- B: Holdout sends nothing and consumes no quota. Experiments cannot bypass other rules and do not affect transactional messages.

## T9 Preview a campaign (10 points)

Explain what would happen without actually sending anything.

File: src/tasks/t9-preview.ts

- A: Deduplicate users. Show each decision, reason and earliest send time with matching totals. Do not write messages, send or spend quota.
- B: Reuse the same decision interface as dispatch. Report unsupported policies. Recheck at actual send time; a preview is not permission.

## T10 Make support retries safe (14 points)

An internal retry button must obey the same platform rules.

File: src/tasks/t10-support.ts

- A: Only the supplied operator identity can retry. Audit accepted and rejected operations; replay a request ID without scheduling twice.
- B: Preserve the message key and attempt budget. Do not resend terminal messages. Reconcile unknown outcomes—even after the send budget runs out. Eligible retries still pass all active send policies.
