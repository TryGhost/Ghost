# Automations

- Read the [overview](README.md) before changing this subsystem. The rules below describe the target boundary during the repository migration, not a repository-wide data-access standard.

## Responsibilities

- Put application-operation decisions, domain validation, IDs and timestamps, action ready-time calculations, response assembly, and query orchestration in the API or its private helpers. The API is used by internal callers as well as HTTP endpoints.
- Keep repository query methods connection-taking and roughly one query each. SQL joins, filters, aggregates, row decoding, locks, conditional updates, and empty-insert guards belong there. Do not split a combined query into extra round trips to simplify its SQL.
- Keep process-lifetime coordination in [`service.ts`](service.ts): boot initialization, poll-event subscriptions, `oneAtATime` invocation guards, in-memory timers, signed scheduler callbacks, and re-arming through `rescheduleAll`.
- Keep step execution in [`poll.ts`](poll.ts): current-member eligibility checks, email sending, retry policy, and choosing the next poll time. Call API operations to claim steps and persist outcomes; use the injected callback to schedule another poll.
- Call this in-process function the poller, not a separate worker service. Do not move its execution decisions or the service's scheduling responsibilities into the API as part of the repository refactor.
- Distinguish an action's `ready_at` from the scheduler's wake-up time. Reuse [`getReadyAtForAction`](util/get-ready-at-for-action.ts) for action timing and preserve the configured fake wait-hours multiplier.

## Migration and examples

- Follow [`automations-api-2.ts`](automations-api-2.ts), [`automations-repository-2.ts`](automations-repository-2.ts), and [`database-automations-repository-2.ts`](database-automations-repository-2.ts) for new and migrated operations. Logic remaining in the legacy database repository is migration backlog, not precedent for new code.
- Keep the public [`automations-api.ts`](automations-api.ts) import surface and caller contracts stable. Preserve existing dependency timing when wiring collaborators into the API factory; do not introduce a new container or repository generation.
- Use `notify` as the example of API-owned enrollment, prepared insert rows, and a transaction followed by a poll request. Use `trackEmailClicked` as the example of a caller-supplied transaction, conditional mutation, and deduplicated counting.
- Reuse existing query primitives such as `insertActions` and `insertRunSteps`. Extracting a query is an intermediate step; migrate the parent operation's orchestration out of the database repository too.
- Preserve behavior while moving ownership. Keep service initialization changes and removal of [`legacy welcome-email polling`](welcome-email-automation-poll.ts) separate from repository migration.

## Transactions and concurrency

- Compose atomic operations through `withTransaction` and pass the same connection to every query. Use a caller-supplied transaction when provided instead of opening an independent one. Use `withConnection` when no transaction is required.
- Keep transaction boundaries, lock ordering, and conditional-write predicates intact. Repository methods perform locks and guarded writes; the API decides when to compose them. Read the [row-locking guidance](../../../../../docs/codebase/database.md#row-locking) before changing relational writes.
- Preserve step ownership guards on ID, pending status, and `locked_by`; a stale owner must not change a reclaimed step. Finish a step and enqueue its successor in one transaction so concurrent completion cannot enqueue duplicates.
- Preserve activation-limit serialization and the atomic cancellation of eligible pending steps when disabling or archiving. Do not cancel a freshly locked step.
- Preserve revision-before-recipient lock ordering, earliest email-event timestamps, and first-open/first-click deduplication. Counter changes must remain atomic with their corresponding recipient changes.
- Dispatch events that depend on writes only after commit, as `notify` does. An emitted poll request is not the poller's execution or the service's timer management.

## Behavior to preserve

- Keep graph validation and draft-versus-active email validation intact. Reuse [`automations-schemas.ts`](automations-schemas.ts) and existing validators rather than adding competing schemas. Preserve action identity/type checks, soft deletion, and revision reuse for unchanged content.
- Preserve default welcome-flow conversion during browse, including idempotence and activation-slot allocation. Refactoring data access does not authorize moving conversion into boot.
- Keep summaries and run lists consistent: pending steps take precedence; unknown statuses fail rather than becoming a fourth status; runs without recorded steps are excluded. `failed` is a detail of an exited-early run, not another run status.
- Hydrate current members from Core. Keep deleted or missing members null without removing ordinary browsed runs; member search must not match historical identity. Do not send member names or emails to Tinybird.
- Preserve literal member-search matching, complete-match versus candidate-scan behavior, bounded work, and `more`/`scanning`/`exhausted` pagination states. Follow [`automation-member-search.ts`](automation-member-search.ts) and its limits instead of duplicating its algorithm or numeric budgets here.
- Preserve cursor binding and stable timestamp/ID ordering in [`automation-run-cursor.ts`](automation-run-cursor.ts). These are live reads, not snapshots. Keep entry-date filtering and timezone/DST handling aligned between summaries and ordinary run browsing; member search spans all time and statuses.
- Build run history from recorded steps and their referenced revisions, including soft-deleted actions, never the current graph. Reject malformed or empty histories. Keep recipient identity private and scope earliest send/delivery timestamps to both the step and revision; delivery is not implied by sending.
- Preserve date contracts: request calendar-date bounds are inclusive, the returned window end is exclusive, and `ready_at` is eligibility rather than a guaranteed execution time. Do not substitute `updated_at` for completion timestamps.

## Verification

- Extend or retarget existing behavioral tests as operations migrate; do not replace them with assertions about private helpers or incidental call order.
- Test API behavior in [`automations-api-2.test.ts`](../../../../test/unit/server/services/automations/automations-api-2.test.ts) with the existing [test repository](../../../../test/unit/server/services/automations/test-automations-repository-2.ts). Verify SQL and row-lock behavior in the [MySQL repository integration suite](../../../../test/integration/services/automations/database-automations-repository-2.test.ts); an in-memory fake or SQLite test does not prove MySQL locking.
- Use [`service.test.ts`](../../../../test/unit/server/services/automations/service.test.ts) for scheduling and [`poll.test.ts`](../../../../test/unit/server/services/automations/poll.test.ts) for execution and retries. Keep tests at the responsibility being changed.
- Run the affected [Admin API suites](../../../../test/e2e-api/admin/automations.test.ts), including sibling limits, performance-stats, runs, member-search, and run-history suites when their contracts are affected. Follow the [testing guide](../../../../../docs/contributing/testing.md) for Nx commands and prerequisites; `pnpm check` does not run database integration or server E2E suites.
