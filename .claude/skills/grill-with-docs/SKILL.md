---
name: grill-with-docs
description: Adversarially interrogate the current work-in-progress against the project's own documentation (prd.md, domainmodel.md, architecture docs, prd-checklist, decisions log). Use when the user wants the implementation grilled — i.e., every claimed-done checklist item challenged with doc citations and code evidence — before committing or checking items off. Triggers: "grill this", "grill the diff", "challenge the checklist", "does the code actually match the PRD".
---

# Grill With Docs (Phantom adaptation)

Interrogate the implementation the way a skeptical reviewer would: every claim
of "done" must survive cross-examination against the project's own documents.
The deliverable is a set of hard, specific questions and verdicts — not a fix.

## Ground-truth documents (read these first, in this order)

All docs live in `phantom/docs/`:

1. `phantom/docs/decisions.md` — the binding rulings from prior grill
   sessions. Never re-litigate a ruling; grill against it.
2. `phantom/docs/domainmodel.md` — ubiquitous language, aggregates, bounded
   contexts. Code that invents its own vocabulary or collapses aggregates is
   suspect.
3. `phantom/docs/prd.md`, `prd-operations.md`, `prd-admin-settings.md`
   — each requirement has 2–4 concrete acceptance criteria. A checklist `[x]`
   is only as good as the criteria it satisfies.
4. `phantom/docs/architecture.md` — system architecture: runtime, database,
   queues, central services, compat facades, themes.
5. `phantom/docs/module-architecture.md` — module layout (`db.ts`, `model.ts`,
   `repo.ts`, `service.ts`, `contracts.ts`, `routes.ts`), thin routes,
   decoupled request/response schemas, simplicity rules.
6. `phantom/docs/prd-checklist.md` — the claims under interrogation. Diff it:
   items flipped `[ ]`→`[x]` in the working set are the primary targets.
7. `phantom/agents.md`, `phantom/status.md` — conventions (yarn v1, Ghost
   naming, colocated Vitest tests) and last known state.

## Procedure

1. **Scope the claims.** `git diff phantom/docs/prd-checklist.md` to list
   newly checked items. Map each to its PRD section and acceptance criteria.
2. **Cross-examine each claim.** For each `[x]`, find the code that allegedly
   satisfies it. Classify:
   - **Holds** — code + tests satisfy the PRD acceptance criteria.
   - **Partial** — the happy path exists; named criteria are missing
     (cite which bullet of the PRD is unmet).
   - **Hollow** — checkbox theater: a stub, a type, or nothing at all.
3. **Grill the architecture.** Does each module follow the documented layout?
   Are routes thin? Are request/response schemas distinct? Did `model.ts`
   invariants land in the right layer, or leak into routes/repos?
4. **Grill the language.** Domain model names (Issue, Delivery, Suppression,
   OutboxMessage, ContentEntitlement vs MarketplaceEntitlement…) must appear
   in code. Renames and conflations are findings.
5. **Run the tests.** `yarn --cwd phantom test`. A claim with no failing OR
   passing test exercising its acceptance criteria is at best Partial.
6. **Verdict.** Output a table of claims with verdicts, then the hard
   questions — each question must cite a doc line and a code location. End
   with which checklist items should be unchecked.

## Interactive interrogation mode

When the user wants to be grilled (rather than the code), switch to a
one-question-at-a-time protocol:

1. Ask exactly ONE question per turn, then stop and wait for the answer.
2. Target **tensions between documents** (e.g. checklist says done, PRD
   acceptance bullets unmet; architecture mandates a layer the simplicity
   rules discourage) and **unclear language** (terms like "queue-backed",
   "supports", "integration" that the docs never define precisely).
3. Every question must cite the conflicting doc passages (file + section)
   so the user can rule on them, not on vibes.
4. Prefer questions whose answer changes what happens next (what gets
   unchecked, built, or rewritten). Skip trivia.
5. After each answer, record the resolution (update the checklist, doc, or
   a decisions log as directed) before asking the next question.
6. Stop when the load-bearing ambiguities are resolved or the user calls it.

## Rules

- Evidence or it didn't happen: every verdict cites `file:line`.
- The PRD acceptance bullets are the bar — not "the endpoint exists".
- UI-flow requirements (PRD sections 16–19) cannot be satisfied by a
  backend-only API; if checked, ask what artifact justifies the claim.
- Fan out subagents per bounded context for large working sets; keep the
  synthesis (verdicts + questions) in the main context.
- Do not fix anything during the grill. Findings only.
