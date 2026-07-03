# Automated Email Analytics Implementation Tasks

## Rules For The Agent

- Use red/green TDD. Do not write a batch of tests up front.
- Work in vertical slices: one failing behavior test, minimal implementation, green, then refactor.
- Keep refactors atomic and behavior-preserving. Prefer extract-function, extract-class, move-method, and parameterize-existing-code over rewrites.
- Never refactor while red.
- Keep newsletter analytics behavior unchanged while extracting shared orchestration.
- Use `pnpm` for all commands.
- When adding database migrations, use the Ghost database migration skill and follow the repository migration conventions.
- Make a git commit after each red/green cycle.
- Each commit must be atomic, with all relevant focused tests passing before committing.
- Use short, concise commit messages that follow the repository commit conventions.
- Expect the full implementation to take at least 15 atomic commits.
- Do not batch multiple red/green cycles into one commit unless the cycle was reverted or abandoned before commit.
- Keep [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md) updated throughout the spike.
- When a non-trivial implementation decision is not already covered by `PLAN.md`, the ADR, or the Email Analytics context, make the decision using best judgment and record the dilemma, decision, and rationale in `IMPLEMENTATION_NOTES.md`.

## Reference Docs

- [PLAN.md](PLAN.md)
- [ADR 0001](docs/adr/0001-automated-email-analytics-pipeline.md)
- [Email Analytics Context](ghost/core/core/server/services/email-analytics/CONTEXT.md)
- [Implementation Notes](IMPLEMENTATION_NOTES.md)

## Commit Discipline

Every red/green cycle should end with:

1. The focused test for that cycle passing.
2. Any previously affected focused tests still passing.
3. A small commit containing only the files changed for that cycle.
4. A concise commit message.

Examples:

```text
Added runner characterization test
Extracted email analytics runner
Parameterized Mailgun analytics tags
Added automation recipient analytics columns
Tracked automation sent count
Processed automation opened events
```

Before each commit, run:

```bash
git status --short
git diff --check
```

Then run the focused test command listed for the task. If a broader affected test is listed, run that too.

After each commit, run:

```bash
git status --short
```

The implementation should be reviewable as a sequence of small, working commits. If a red/green cycle reveals that the planned task is wrong, update `TASKS.md` or `IMPLEMENTATION_NOTES.md` in its own small commit before continuing.

## Target Shape

The final spike should have:

- Shared fetch orchestration that can run newsletter and automation analytics pipelines independently.
- Existing newsletter analytics still using the existing job names and behavior.
- A new automation analytics pipeline using the `automation-email` Mailgun tag.
- Automation v1 handling only sent, delivered, and opened.
- `sent_count` incremented by the automation send path.
- `delivered_count` and `opened_count` incremented by automation analytics jobs.
- Incremental aggregate counters on `automation_action_revisions`.
- Separate member automation counters: `automation_email_count`, `automation_email_opened_count`, `automation_email_open_rate`.
- Per-batch transactions for recipient state updates and aggregate increments.

## Spike Success Criteria

The spike is complete when:

- Newsletter email analytics tests still pass with existing job names and behavior.
- The shared fetch orchestration can run newsletter and automation pipelines independently.
- Automation sends can persist `mailgun_message_id` and increment `sent_count`.
- Automation analytics can process delivered and opened provider events idempotently.
- Automation action revision counters update incrementally.
- Member automation counters update separately from newsletter member counters.
- Focused unit and integration tests cover the full v1 path.
- `IMPLEMENTATION_NOTES.md` records any meaningful deviations, tradeoffs, and production follow-ups discovered during the spike.

## Non-Goals For This Spike

Do not implement:

- Failed event handling.
- Complaint or unsubscribe event handling.
- Raw Mailgun event storage.
- Scheduled/backfill automation analytics.
- Newsletter incremental aggregation.
- Newsletter job renaming.
- UI reporting surfaces beyond what is needed to prove backend behavior.
- Broad cleanup outside the email analytics and automation send paths.

## Evidence To Capture For Production Design

As the spike progresses, record the following in `IMPLEMENTATION_NOTES.md` when applicable:

- Any uncertainty about where `mailgun_message_id` comes from in the automation send path.
- Any transactional consistency gaps between the send path, recipient rows, and counters.
- Any migration/backfill concerns for existing `automated_email_recipients` rows.
- Any indexes needed beyond `mailgun_message_id + member_email`.
- Any performance concerns from batch processing or aggregate updates.
- Any concurrency or deadlock risks observed in tests or code review.
- Any places where existing newsletter abstractions made automation harder than expected.
- Any parts of the spike that should be rewritten before productionizing.

## Phase 0: Baseline And Characterization

### Task 0.1: Prove The Current Newsletter Tests Pass

RED: none. This is a baseline check.

GREEN:

```bash
cd ghost/core
pnpm test:single test/unit/server/services/email-analytics/email-analytics-service.test.js
pnpm test:single test/unit/server/services/email-analytics/email-analytics-provider-mailgun.test.js
```

Expected result: both existing test files pass before refactoring.

### Task 0.2: Add Characterization Tests For Current Fetch Orchestration

RED: add focused unit tests around the public `EmailAnalyticsServiceWrapper.startFetch()` behavior.

Cover one behavior at a time:

- First test: start fetch prioritizes opened events, then non-opened events, then missing events.
- Second test: when opened events hit the max event budget, the wrapper restarts instead of fetching non-opened events.
- Third test: overlapping `startFetch()` calls do not run two fetches at once.
- Fourth test: scheduled fetch only runs after latest and missing work are below budget.

GREEN: add the smallest test seams needed to instantiate the wrapper with a fake pipeline/service. If the current wrapper is too hard to instantiate, first extract a tiny helper function behind the existing wrapper and test through that helper.

Refactor: keep production behavior identical. Do not introduce automation concepts yet.

Verification:

```bash
cd ghost/core
pnpm test:single test/unit/server/services/email-analytics/email-analytics-service-wrapper.test.js
```

## Phase 1: Extract Shared Fetch Orchestration

### Task 1.1: Extract A Pipeline Runner Without Changing Newsletter Behavior

RED: write one failing test for a new runner module that expresses the existing fetch order:

```text
opened -> non-opened -> missing -> scheduled
```

The test should use a fake pipeline adapter and assert observable calls/results, not private state.

GREEN: extract the orchestration from `email-analytics-service-wrapper.js` into a new module, for example:

```text
ghost/core/core/server/services/email-analytics/runner/email-analytics-runner.js
```

The runner interface should stay small:

```ts
runner.start()
```

The adapter passed into the runner should provide the behavior that varies:

```ts
{
    name,
    restoreScheduled?,
    getLastOpenedEventTimestamp,
    fetchLatestOpenedEvents,
    fetchLatestNonOpenedEvents,
    fetchMissing,
    fetchScheduled?
}
```

Refactor: update `EmailAnalyticsServiceWrapper.startFetch()` to delegate to the runner. Keep the existing wrapper public interface.

Verification:

```bash
cd ghost/core
pnpm test:single test/unit/server/services/email-analytics/email-analytics-runner.test.js
pnpm test:single test/unit/server/services/email-analytics/email-analytics-service-wrapper.test.js
pnpm test:single test/unit/server/services/email-analytics/email-analytics-service.test.js
```

### Task 1.2: Move Completion Logging Behind The Runner Interface

RED: add one runner test that verifies completion logging receives the pipeline name/job type/event counts for a non-empty fetch result.

GREEN: extract the current `_logJobCompletion` behavior into the runner or a runner collaborator.

Constraints:

- Preserve existing newsletter log content where practical.
- Preserve current open-throughput metric behavior for newsletter opened events.
- Do not require automation logging to know newsletter-specific `failed` event breakdowns.

Refactor: make the log formatter accept a result shape that automation can also return later.

Verification:

```bash
cd ghost/core
pnpm test:single test/unit/server/services/email-analytics/email-analytics-runner.test.js
```

### Task 1.3: Parameterize Mailgun Tags Without Changing Newsletter Defaults

RED: add one provider test showing a provider constructed with `tags: ['automation-email']` sends `tags: 'automation-email'` to Mailgun.

GREEN: parameterize `EmailAnalyticsProviderMailgun` so existing newsletter construction still defaults to `bulk-email` plus any configured bulk tag, while automation can pass its own tag list.

Refactor: keep event filtering behavior unchanged for newsletter.

Verification:

```bash
cd ghost/core
pnpm test:single test/unit/server/services/email-analytics/email-analytics-provider-mailgun.test.js
```

### Task 1.4: Parameterize Fetch State And Job Names

RED: add one behavior test that a fetch adapter configured with automation job names reads/writes those job names when fetching opened events.

GREEN: extract the fetch state/job-name mechanics from `EmailAnalyticsService` into a small reusable module, or parameterize `EmailAnalyticsService` with job names while preserving newsletter defaults.

Preferred small interface:

```ts
{
    latestOpenedJobName,
    latestNonOpenedJobName,
    missingJobName,
    scheduledJobName?
}
```

Newsletter defaults must remain:

```text
email-analytics-latest-opened
email-analytics-latest-others
email-analytics-missing
email-analytics-scheduled
```

Automation names must be:

```text
email-analytics-automation-latest-opened
email-analytics-automation-latest-others
email-analytics-automation-missing
```

Refactor: keep the old `EmailAnalyticsService` constructor valid for existing tests.

Verification:

```bash
cd ghost/core
pnpm test:single test/unit/server/services/email-analytics/email-analytics-service.test.js
```

## Phase 2: Add Automation Schema

### Task 2.1: Add Recipient Event State And Lookup Columns

RED: add a schema/migration test if the repository has a nearby convention for migration assertions. If not, inspect generated schema changes manually after migration generation.

GREEN: add a migration for `automated_email_recipients`:

- `mailgun_message_id`
- `delivered_at`
- `opened_at`
- index for `mailgun_message_id` plus `member_email`

Do not add:

- `failed_at`
- failure metadata
- `unsubscribed_at`
- `complained_at`

Verification:

```bash
cd ghost/core
pnpm test:single test/unit/server/services/automations/poll.test.ts
```

Also run the focused migration/schema verification command used by this repo if available.

### Task 2.2: Add Automation Action Revision Counters

RED: add the smallest schema-facing test or fixture expectation that needs the counters.

GREEN: add counters to `automation_action_revisions`:

- `sent_count`
- `delivered_count`
- `opened_count`

Default each to `0`.

Verification: run the same focused schema/migration verification as Task 2.1.

### Task 2.3: Add Member Automation Counter Columns

RED: add the smallest serializer/model/schema test that demonstrates member automation stats are separate from existing newsletter fields.

GREEN: add member columns:

- `automation_email_count`
- `automation_email_opened_count`
- `automation_email_open_rate`

Rules:

- Do not reuse `email_count`, `email_opened_count`, or `email_open_rate`.
- Keep `automation_email_open_rate` nullable.

Verification:

```bash
cd ghost/core
pnpm test:single test/unit/server/services/members/members-api/members-api.test.js
```

Adjust the command if the closest affected tests live elsewhere.

## Phase 3: Update The Automation Send Path

### Task 3.1: Persist `mailgun_message_id`

RED: write one test for the automation send path proving a successfully sent automated email stores the Mailgun message id on `automated_email_recipients`.

Likely entry points to inspect:

- `ghost/core/core/server/services/automations/poll.ts`
- `ghost/core/core/server/services/automations/welcome-email-automation-poll.js`
- `ghost/core/core/server/services/member-welcome-emails/service.js`

GREEN: thread the Mailgun message id returned by the send operation back to the recipient row.

Refactor: avoid changing newsletter send behavior.

Verification:

```bash
cd ghost/core
pnpm test:single test/unit/server/services/automations/poll.test.ts
pnpm test:single test/integration/services/automations/welcome-email-automation-poll.test.js
```

### Task 3.2: Increment `sent_count` From The Send Path

RED: write one test proving `automation_action_revisions.sent_count` increments only after a send succeeds and `mailgun_message_id` is available.

GREEN: update the send path to increment `sent_count` for the related `automation_action_revision_id`.

Required invariant:

```text
a counted send is traceable to a Mailgun message
```

Do not increment `sent_count` for a pending recipient row that has not received `mailgun_message_id`.

### Task 3.3: Increment Member Automation Sent Count

RED: write one test proving an automated email send increments `members.automation_email_count` and does not change `members.email_count`.

GREEN: update the send path to increment the automation-specific member counter.

Refactor: keep this write close to the successful send transaction if the send path already has a transaction. If not, document the consistency tradeoff in code or tests.

## Phase 4: Build Automation Event Processing

### Task 4.1: Resolve Events By `mailgun_message_id + member_email`

RED: write one automation event processor test that passes a normalized opened event and resolves the matching `automated_email_recipients` row by `mailgun_message_id` plus recipient email.

GREEN: create an automation-specific event processor, for example:

```text
ghost/core/core/server/services/email-analytics/automation/automation-event-processor.js
```

Do not route automation events through the newsletter `EmailEventProcessor`.

### Task 4.2: Apply Opened Events Idempotently

RED: write one test proving an opened event sets `opened_at`, increments `opened_count`, and increments `automation_email_opened_count`.

GREEN: implement opened-event handling in a per-batch transaction:

- conditionally set `automated_email_recipients.opened_at`
- increment `automation_action_revisions.opened_count` only when the row transitions
- increment `members.automation_email_opened_count` only when the row transitions
- update `automation_email_open_rate` only when the member has at least 5 tracked automation emails

Add a second red/green cycle for duplicate opened events:

- duplicate opened event does not double-increment counters

### Task 4.3: Apply Delivered Events Idempotently

RED: write one test proving a delivered event sets `delivered_at` and increments `delivered_count`.

GREEN: implement delivered-event handling in the same per-batch transaction style.

Add a second red/green cycle for duplicate delivered events:

- duplicate delivered event does not double-increment counters

### Task 4.4: Allow Opened Before Delivered

RED: write one test proving opened is processed even when `delivered_at` is null.

GREEN: ensure opened processing has no dependency on delivered state.

Verification:

```bash
cd ghost/core
pnpm test:single test/unit/server/services/email-analytics/automation/automation-event-processor.test.js
```

## Phase 5: Wire The Automation Pipeline

### Task 5.1: Add Automation Pipeline Adapter

RED: write one test proving the automation pipeline adapter fetches:

- opened events for latest-opened
- delivered events for latest-others
- opened and delivered events for missing

GREEN: add an automation pipeline adapter that satisfies the runner interface and uses:

- `automation-email` Mailgun tag
- automation job names
- automation event processor

Do not implement scheduled/backfill automation analytics.

### Task 5.2: Add Automation Recurring Job

RED: write one job scheduling test proving automation analytics registers a separate recurring job when automation analytics is enabled and there are recent automated email recipients/sends.

GREEN: add an automation analytics job entry point parallel to the existing newsletter `fetch-latest` job.

Constraints:

- Keep newsletter job name `email-analytics-fetch-latest`.
- Use a distinct automation job name, for example `email-analytics-automation-fetch-latest`.
- Use randomized cron seconds/minutes like the newsletter job to avoid API spikes.

### Task 5.3: Initialize Both Pipelines

RED: write one wrapper/bootstrap test proving the newsletter and automation analytics runners can be initialized independently.

GREEN: update the email analytics wrapper/bootstrap so:

- existing newsletter analytics still initializes as before
- automation analytics initializes behind the automations beta/private flag or agreed config gate
- one pipeline being behind does not prevent the other from running

## Phase 6: Integration Coverage

### Task 6.1: Event Batch Updates Recipient And Aggregates

RED: write an integration test with realistic rows:

- one automation action revision
- one member
- one automated email recipient with `mailgun_message_id`
- one opened event
- one delivered event

Assert:

- recipient `opened_at` and `delivered_at` are set
- action revision counters increment
- member automation counters increment
- newsletter member counters do not change

GREEN: wire any missing repository/query code.

### Task 6.2: Reprocessing Is Idempotent

RED: rerun the same event batch and assert counters do not increment again.

GREEN: fix conditional updates or transaction logic until the test passes.

### Task 6.3: Job Cursors Are Independent

RED: write a test proving automation job cursors use `email-analytics-automation-*` names and do not read/write newsletter cursor rows.

GREEN: fix job-name wiring.

## Phase 7: Operational Checks And Cleanup

### Task 7.1: Add Metrics/Logs For Automation Pipeline

RED: add one focused test if the logging/metrics path is testable without coupling to implementation.

GREEN: log automation job completion with:

- pipeline name
- job type
- event count
- API polling time
- processing time
- aggregation time
- duplicate/no-op count if available

### Task 7.2: Run Focused Verification

Run the narrow test set first:

```bash
cd ghost/core
pnpm test:single test/unit/server/services/email-analytics/email-analytics-service.test.js
pnpm test:single test/unit/server/services/email-analytics/email-analytics-provider-mailgun.test.js
pnpm test:single test/unit/server/services/email-analytics/email-analytics-runner.test.js
pnpm test:single test/unit/server/services/email-analytics/automation/automation-event-processor.test.js
pnpm test:single test/unit/server/services/automations/poll.test.ts
pnpm test:single test/integration/services/automations/welcome-email-automation-poll.test.js
```

Then run the broader affected area if time allows:

```bash
cd ghost/core
pnpm test:unit
```

### Task 7.3: Final Refactor Pass

Only after all focused tests are green:

- Remove duplicated timing/logging code.
- Rename shallow helper functions if the interface is misleading.
- Keep the runner interface small.
- Keep automation processing separate from newsletter recipient mutation.
- Update `PLAN.md`, `TASKS.md`, ADR, or context docs if implementation reveals a changed decision.

## Suggested Commit Slices

1. Characterization tests for current newsletter orchestration.
2. Extract shared runner with newsletter behavior unchanged.
3. Parameterize Mailgun tags and job names.
4. Add automation schema.
5. Persist `mailgun_message_id` and sent counters.
6. Add automation event processor and incremental aggregation.
7. Add automation jobs/pipeline wiring.
8. Add integration coverage and operational logging.
