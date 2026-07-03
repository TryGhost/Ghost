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
