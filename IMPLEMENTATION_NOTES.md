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

No implementation decisions recorded yet.

## Production Design Questions To Revisit

- Is `mailgun_message_id + member_email` sufficient as the long-term recipient lookup key?
- Should automation analytics counters stay directly on `automation_action_revisions`, or move to a dedicated stats table after the spike?
- Is per-batch transaction scope still appropriate once realistic batch sizes are tested?
- Should member automation counters be exposed through existing members APIs, or a separate reporting API?
- Do existing automation recipient rows need a migration/backfill strategy, or can analytics start only for newly sent automation emails?
- What config flag or beta gate should control automation analytics in production?
- What metrics/alerts are needed for automation analytics lag and no-op duplicate event rates?
