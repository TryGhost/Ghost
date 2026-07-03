# Automated Email Analytics Implementation Notes

This file is the running journal for the automated email analytics spike.

Use it to record challenges and implementation decisions made while working through [TASKS.md](TASKS.md). Keep entries concise, factual, and useful for turning the spike into a final design.

## How To Use This File

Add an entry whenever:

- The implementation reveals a mismatch with the plan.
- A test exposes an edge case not covered in the reference docs.
- There are multiple reasonable implementation options and the agent chooses one.
- A temporary spike compromise is made.
- A task needs to be split, reordered, skipped, or rewritten.

Do not record trivial local choices such as variable names, import ordering, or obvious lint fixes.

## Entry Template

```md
## YYYY-MM-DD - Short Title

**Dilemma**:
What problem or ambiguity came up?

**Decision**:
What did we decide or implement?

**Rationale**:
Why this choice over the alternatives?

**Follow-up**:
What should a future implementation or design review revisit, if anything?
```

## Entries

## 2026-07-03 - Aggregate Delta Flush Granularity

**Dilemma**:
The plan describes collecting aggregate deltas for a fetched page and flushing one additive update per aggregate target where possible. The spike implementation applies conditional recipient transitions and immediately increments the matching action/member counters inside the same per-batch transaction.

**Decision**:
Keep the per-transition aggregate increments for the spike instead of introducing a second delta accumulator late in the implementation.

**Rationale**:
The current shape preserves the important idempotency and transaction guarantees while keeping the event processor straightforward and covered by the focused tests. The remaining difference is write efficiency for batches with many events for the same aggregate target, which should be measured before productionizing.

**Follow-up**:
Before productionizing, test realistic Mailgun page sizes and decide whether to replace per-transition aggregate writes with per-batch delta flushing keyed by action revision and member.

## 2026-07-03 - Automation No-Op Logging Source

**Dilemma**:
Task 7.1 added runner support for logging duplicate/no-op counts when a pipeline result exposes `noop`, but the current automation event processor only returns applied `delivered` and `opened` transitions.

**Decision**:
Keep the runner logging formatter optional for `noop` and do not force the automation processor or shared `EventProcessingResult` shape to emit no-op counts during this spike.

**Rationale**:
The task only requires no-op logging when the count is available, and broadening processor result semantics now would touch the shared newsletter result type late in the spike. The current implementation still preserves newsletter logging and gives automation a clear logging path once no-op accounting is added.

**Follow-up**:
Before productionizing, decide whether automation duplicate/no-op counts should be emitted by `AutomationEventProcessor`, preserved through `EventProcessingResult`, or tracked as a separate pipeline metric.

## 2026-07-03 - Automation Pipeline Bootstrap Gate

**Dilemma**:
Task 5.3 needs newsletter and automation analytics runners initialized independently, but the scheduler gate already owns the global `emailAnalytics:enabled` and `backgroundJobs:emailAnalytics` checks.

**Decision**:
Keep newsletter wrapper initialization unchanged, and initialize the automation pipeline/event listener only when the existing `automations` labs flag is enabled. The automation pipeline module is required inside that gated block so disabled automation analytics cannot affect newsletter bootstrap.

**Rationale**:
This matches the Task 5.2 scheduling gate without duplicating global config checks in the event listener layer. It also keeps the two pipelines independent: newsletter can subscribe and run even when automation analytics is disabled or not loaded.

**Follow-up**:
Before productionizing, decide whether the bootstrap gate should use a dedicated automation analytics config flag alongside or instead of the `automations` labs flag.

## 2026-07-03 - Automation Analytics Scheduling Gate

**Dilemma**:
Task 5.2 needs automation analytics to register a separate recurring job only when automation analytics is enabled, but the spike does not introduce a dedicated automation analytics config flag.

**Decision**:
Gate automation analytics scheduling on the existing `emailAnalytics:enabled` and `backgroundJobs:emailAnalytics` config checks plus the existing `automations` labs flag, and only schedule when recent tracked automated email recipients exist.

**Rationale**:
This is the smallest rollout gate that matches the current beta shape of automations without introducing a new production config surface during the spike. The scheduler still keeps newsletter and automation recurring jobs independent once the shared global checks pass.

**Follow-up**:
Before productionizing, decide whether automation analytics should keep using the `automations` labs flag or move behind a dedicated `emailAnalytics:automations`/private-feature gate with separate operational controls.

## 2026-07-03 - Automation Pipeline Adapter Boundary

**Dilemma**:
Task 5.1 needs an automation pipeline adapter with automation-specific Mailgun tags, job names, event filters, and event processing, but duplicating the existing fetch cursor/window logic would make the spike harder to compare with newsletter behavior.

**Decision**:
Keep the automation adapter thin by composing `EmailAnalyticsService` with configurable fetch event types, automation job names, the `automation-email` provider tag, and an automation batch processor callback.

**Rationale**:
This preserves newsletter defaults while reusing the existing fetch mechanics for latest-opened, latest-others, and missing passes. The adapter owns only the automation-specific choices and does not introduce scheduled/backfill automation analytics.

**Follow-up**:
Before productionizing, revisit whether `EmailAnalyticsService` should become a more explicitly named shared fetch service so the newsletter-shaped class name does not obscure its role in both pipelines.

## 2026-07-03 - Automation Opened Transaction Boundary

**Dilemma**:
Task 4.2 needs opened-event recipient state and aggregate increments to happen in a per-batch transaction, but the current unit tests are intentionally focused on processor behavior and do not run against a real database transaction.

**Decision**:
Expose a small transaction boundary on the automation recipient repository (`withTransaction`) and have the processor execute opened-event resolution, conditional recipient transition, action revision increments, member opened increments, and member open-rate updates inside that boundary.

**Rationale**:
This keeps the processor behavior testable with a fake repository while mapping directly to the DB-backed repository's `db.knex.transaction` implementation. The conditional recipient update remains the idempotency gate for aggregate writes.

**Follow-up**:
Phase 6 should add DB-backed integration coverage that proves the transaction boundary commits recipient state and aggregate increments together, and that rollback behavior is acceptable for a processing batch.

## 2026-07-03 - Automation Event Identity Shape

**Dilemma**:
The automated email analytics plan names the stored lookup key `mailgun_message_id`, while the existing Mailgun event normalization exposes the Mailgun message header as `providerId`.

**Decision**:
The automation event processor consumes normalized events using `event.providerId` as the Mailgun message id and resolves recipients with `providerId + recipientEmail`.

**Rationale**:
This keeps the processor compatible with the existing provider normalization and avoids adding an automation-only normalized event shape before the pipeline wiring exists.

**Follow-up**:
Before productionizing, consider renaming or aliasing the normalized field at the automation pipeline boundary so downstream automation code consistently uses `mailgunMessageId`.

## 2026-07-03 - Welcome Path Revision Counters

**Dilemma**:
Task 3.2 validates revision-level `sent_count` for the newer automation poll path, but the older welcome-email automation poll path still records recipients by `automated_email_id` and does not currently have the same direct `automation_action_revision_id` counter path.

**Decision**:
Kept Task 3.2 focused on the revision-based poll path and did not broaden the spike to redesign the older welcome-email path during validation.

**Rationale**:
The plan places exact aggregate counters on `automation_action_revisions`, and the newer automation poll path already has that revision identity. Expanding the older path now would mix compatibility work into the sent-count slice.

**Follow-up**:
Before productionizing, decide whether the older welcome-email path should be migrated to revision-owned sending, explicitly excluded from automated email analytics, or given a compatibility lookup from `automated_email_id` to `automation_action_revision_id`.

## 2026-07-03 - Sent Count Send-Path Consistency

**Dilemma**:
Task 3.2 needs `automation_action_revisions.sent_count` to increment only for sends with a persisted `mailgun_message_id`. The newer automation poll path records recipients through `AutomatedEmailRecipient.add` but keeps step state writes behind the automations repository, so there is no existing transaction that spans recipient persistence and action revision counter updates.

**Decision**:
Increment `sent_count` through the automations repository only after the recipient row has been recorded with a Mailgun message id. Do not increment when the send result lacks a message id.

**Rationale**:
This preserves the required traceability invariant and keeps the spike change close to the send path without broadening the repository API around recipient persistence. It avoids counting untracked sends, which would be harder to reconcile later.

**Follow-up**:
Before productionizing, consider moving recipient creation plus send-path counter increments into one transaction-owned repository method so a tracked recipient and `sent_count` cannot diverge if the second write fails.

## 2026-07-03 - Automation Send Message Id Shape

**Dilemma**:
Task 3.1 needs `mailgun_message_id` from the automation send path. The bulk Mailgun email provider normalizes successful sends to `{id}`, while the automation send path currently uses `GhostMailer` and receives the underlying mail transport response.

**Decision**:
Persist `mailgun_message_id` from a successful send result by accepting either `id` or `messageId`, preferring `id` when present.

**Rationale**:
`id` matches the existing Mailgun provider contract and the analytics terminology in the spike plan. Accepting `messageId` keeps the automation path tolerant of the transactional mailer response without changing newsletter send behavior.

**Follow-up**:
Production should confirm the exact Mailgun transport response for `GhostMailer` and consider normalizing transactional Mailgun sends behind a small explicit return type.

## 2026-07-03 - Migration Verification Limitation

**Dilemma**:
Task 2.1 calls for focused migration/schema verification. The schema integrity test is available and passed, but manual migration execution with `pnpm knex-migrator migrate --v 6.51 --force` failed because this worktree's local database has not been initialized for knex-migrator.

**Decision**:
Kept the generated migration and schema changes, verified them with `test/unit/server/data/schema/integrity.test.js`, and recorded the blocked manual migration check rather than initializing or mutating the local database state for the spike.

**Rationale**:
Running `knex-migrator init` would change local database state outside the narrow schema slice. The integrity test verifies the declared schema hash, while the migration file follows the existing Ghost migration helpers and should be manually exercised in an initialized dev/test database before production.

**Follow-up**:
Run `pnpm knex-migrator migrate --v 6.51 --force` in an initialized Ghost database before promoting the spike implementation.

## 2026-07-03 - Migration Lock Verification Limitation

**Dilemma**:
Task 2.3 attempted manual migration execution with `pnpm knex-migrator migrate --v 6.51 --force` after the schema and syntax checks passed, but the local database reported that migrations are locked.

**Decision**:
Kept the member automation counter migration verified by syntax check and schema integrity, and did not manually release the local migration lock from the spike task.

**Rationale**:
Manually mutating `migrations_lock` would alter local database state outside the narrow schema task. The migration follows the same idempotent column-migration utility pattern as the previous Phase 2 migrations.

**Follow-up**:
Run `pnpm knex-migrator migrate --v 6.51 --force` in a clean initialized Ghost database before promoting the spike implementation.

## Production Design Questions To Revisit

- Is `mailgun_message_id + member_email` sufficient as the long-term recipient lookup key?
- Should automation analytics counters stay directly on `automation_action_revisions`, or move to a dedicated stats table after the spike?
- Is per-batch transaction scope still appropriate once realistic batch sizes are tested?
- Should member automation counters be exposed through existing members APIs, or a separate reporting API?
- Do existing automation recipient rows need a migration/backfill strategy, or can analytics start only for newly sent automation emails?
- What config flag or beta gate should control automation analytics in production?
- What metrics/alerts are needed for automation analytics lag and no-op duplicate event rates?
- Should automation analytics replace per-transition aggregate increments with per-batch delta flushing before production rollout?
