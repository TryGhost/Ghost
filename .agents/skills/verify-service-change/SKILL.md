---
name: verify-service-change
description: Independently verify a service characterization or defineService migration before its pull request is opened or marked ready. Use when checking tests-only characterization or a service migration that someone else wrote.
---

# Verify a service change

Check another author's work from the code and its claims. An author's own results
show what they thought to test, so they cannot show what they missed.

## Start here

Use only:

- the branch or pull request diff
- the PR description, commit messages and inventory changes
- the output of `pnpm gx services verify <service> --json`

Do not read the author's mutation list, a coordinator's summary or an earlier
review. Ignore them if the brief includes them.

Work in your own checkout of the commit, and restore every mutation. Do not commit,
push or edit the branch: report findings to whoever owns it. Run database suites
one at a time.

## Check every change

1. `gx services verify` has no `fail` result.
2. For each `review` line, read the diff and decide whether it is still true. A
   stale inventory sentence is a finding.
3. Map every claim to evidence: each inventory sentence added or changed, and each
   statement in the PR description and commit messages. "Unchanged" is a claim.
4. Ask whether this is the simplest way. List anything the change does not need.

## Characterization

For each test and inventory sentence, ask: does it do what it says, is it the
simplest way, and is every claim asserted?

Write your own mutations from the production code and run at least one per claim.
Each must fail the test named for that behaviour. Include these variants where
they apply:

- a module loaded at import rather than on use, checked by a test that observes
  the load before the module is first required
- every instance of a repeated dependency, not only the first
- a different error with the same message
- the success path as well as each failure path
- a fake clock away from the boundary it is set to
- a chained handler where the test only inspects the first call

Say when fakes hide the risk, such as a test that fakes Express for code whose
regression would only show in a booted app.

## Migration

Fill in one row for each dependency, resource and consumer:

| Item | Old: when and how often resolved | New: when and how often resolved | Read by consumers at | On failure |
| ---- | -------------------------------- | -------------------------------- | -------------------- | ---------- |

Every difference needs a reason in the PR description. Look hardest at:

- work the old root repeated on each boot in one process, now run once
- reads at module load, including route loaders and test harnesses
- fixtures and consumer tests that still use the old shape
- failures that moved between boot and the first request
- anything left half-started when init fails and is retried
- whether a boot test holds init pending, rather than only checking call order

Then check the shape of the change:

- A stateless utility must be imported under an exact allowance, not injected.
- Injected logging is `GhostLogger` or a `Pick` of it, and class tests use
  `createLoggingFake()`.
- A root that still builds itself in two steps is not finished.

Note in the report if consumer files changed outnumber the service's own files, or
if the inventory disposition is not `migrate`. Both can mean the service should not
be migrated this way, so finish the review and raise them for the owner.

## Report

| Claim or row | Evidence | Mutation and result | Finding | Severity |
| ------------ | -------- | ------------------- | ------- | -------- |

Use three severities:

- **Blocker:** a regression, a broken consumer, or a claim that is false.
- **Should fix:** a claim the tests do not prove, or stale text.
- **Note:** a gap the change does not claim to close.

Finish with a verdict. Say "ready" when no row is a blocker or an unresolved "should
fix", and list anything you did not run.
