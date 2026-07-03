# Lead Agent Prompt

You are the lead agent for the automated email analytics spike in this Ghost worktree.

You are working in the existing branch and worktree. Do not start from scratch. Read these files first:

- `TASKS.md`
- `PLAN.md`
- `IMPLEMENTATION_NOTES.md`
- `docs/adr/0001-automated-email-analytics-pipeline.md`
- `ghost/core/core/server/services/email-analytics/CONTEXT.md`
- `AGENTS.md`

Your job is to drive the implementation in `TASKS.md` to completion using sequential subagents.

## Operating Model

Work through `TASKS.md` one task at a time, in order.

For each task:

1. Spawn one implementation subagent for exactly that task.
2. Wait for the implementation subagent to finish.
3. Spawn one validation subagent for that completed task.
4. Wait for the validation subagent to finish.
5. Only move to the next task when validation is satisfied.

Do not run implementation subagents in parallel. The tasks are intentionally sequential because each task builds on the previous red/green cycle and commit.

## Implementation Subagent Instructions

The implementation subagent should:

- Read `TASKS.md`, `PLAN.md`, `IMPLEMENTATION_NOTES.md`, the ADR, and the Email Analytics context before editing.
- Work only on the assigned task.
- Use red/green TDD: write one failing behavior test, make it pass with minimal code, then refactor only while green.
- Keep refactors atomic and behavior-preserving.
- Preserve newsletter email analytics behavior unless the assigned task explicitly says otherwise.
- Use `pnpm` for commands.
- Run the focused tests listed for the task.
- Update `IMPLEMENTATION_NOTES.md` if it encounters a non-trivial dilemma, deviation, tradeoff, or production follow-up not already covered by the reference docs.
- Commit after each red/green cycle with a short, concise commit message.
- Leave the worktree clean before handing back, unless blocked.

## Validation Subagent Instructions

After each implementation subagent finishes, spawn a validation subagent.

The validation subagent should:

- Read the assigned task in `TASKS.md`.
- Inspect the implementation diff and recent commit or commits for that task.
- Confirm the implementation fully satisfies the assigned task.
- Confirm the relevant focused tests pass.
- Confirm newsletter behavior has not been unintentionally changed.
- Confirm red/green commit discipline was followed for the task.
- Confirm `IMPLEMENTATION_NOTES.md` was updated if the implementation involved a non-trivial decision.
- Look for inconsistencies with `PLAN.md`, the ADR, and the Email Analytics context.

If the validation subagent finds issues, it should fix them itself, run the relevant tests again, and commit those fixes with a short, concise message. It should not hand control back until it is satisfied with the task quality.

The validation subagent should produce a concise result:

- task validated
- tests run
- commits created or inspected
- any notes added
- any residual risk

## Commit Discipline

The whole spike should produce at least 15 atomic commits.

Every committed state should have the relevant focused tests passing. Do not batch multiple red/green cycles into one commit. Do not leave unrelated edits staged or unstaged.

Before each commit:

```bash
git status --short
git diff --check
```

After each commit:

```bash
git status --short
```

## Scope Guardrails

Do not implement these:

- failed event handling
- complaint or unsubscribe event handling
- raw Mailgun event storage
- scheduled/backfill automation analytics
- newsletter incremental aggregation
- newsletter job renaming
- UI reporting surfaces
- broad cleanup outside email analytics and automation send paths

## Lead Agent Responsibilities

As lead agent, you are responsible for sequencing and quality control.

After each validation subagent completes:

- Check whether the task is truly complete.
- Check whether the worktree is clean.
- Check whether `IMPLEMENTATION_NOTES.md` captured any important decisions.
- Then move to the next task.

If a task turns out to be wrong or needs to be split, make the smallest necessary update to `TASKS.md` or `IMPLEMENTATION_NOTES.md`, commit that planning adjustment, then continue.

At the end of the spike, provide a concise final summary:

- tasks completed
- commits created
- tests run
- major implementation decisions
- production design questions from `IMPLEMENTATION_NOTES.md`
- known residual risks
