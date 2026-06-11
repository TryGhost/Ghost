# Ghost v10 Decisions Log

Binding rulings from /grill-with-docs sessions. Each is folded into the
governing docs, all in this directory (`prd.md`, `prd-operations.md`,
`prd-admin-settings.md`, `domainmodel.md`, `architecture.md`,
`module-architecture.md`); this log is the dated provenance.

## 2026-06-10 — round one (implementation vs docs)

1. **Checklist bar** — `[x]` in `prd-checklist.md` asserts the PRD's
   acceptance bullets are implemented AND at least one colocated test
   exercises them. Scaffolding (schema + routes without behavior) does not
   qualify.
2. **UI scope** — UI-flow sections (PRD 16-19, Admin Settings PRD) are in
   scope: phantom hosts the existing frontend bundles and their bullets are
   verified by browser e2e tests against phantom.
3. **Queue** — "queue-backed" requires three adapters (in-memory for
   dev/tests, BullMQ for Node, Cloudflare Queues for Workers) behind one
   provider interface, with a worker actually consuming jobs.
4. **Central services** — flows depending on Partner Portal, Marketplace
   Registry, or central Billing are verified against simple standalone mock
   services exposing those surfaces remotely (real HTTP, real signed
   tokens/keys). Contracts first, then mocks.
5. **model.ts** — mandatory in every module; domain invariants live there,
   not in `service.ts`. (The growth-gated alternative was explicitly
   declined.) Current source only has `model.ts` in `site` and `identity`;
   the remaining modules are standing debt, not an accepted pattern.
6. **Migrations** — Operations PRD section 2 governs v10's own schema:
   versioned, reversible SQL migrations with tested rollback/re-apply and
   idempotency. The migration-log stub does not qualify.
7. **Activity feed** — the feed projection (ActivityEvent, distinct from
   AnalyticsEvent) is deferred until the admin feed UI is wired up; the
   single analytics event store stands meanwhile.
8. **Storage switching** — operator contract: adapters share one stable
   path scheme; the operator moves files on switch; no per-asset backend
   tracking or data migration.
9. **Divergence** — restructuring away from a legacy Ghost table is paid
   for when the importer converts that table from a real Ghost export,
   proven by a fixture-based test.
10. **Email rendering** — issues render live at delivery time; no stored
    send-time snapshot. Mid-send edits may alter later batches — accepted
    to keep conditional/personalized content possible.
11. **Initial re-grade** — sections 5-19, Operations, and Admin Settings were
    re-graded against the bar in round one. The doc consolidation review
    superseded this by re-grading the full checklist against `phantom/src`.

## 2026-06-10 — round two (shape of the project)

12. **Purpose** — phantom is Ghost v10: a real production replacement.
    Breaking changes acceptable; forward migration from current-day Ghost
    mandatory.
13. **Runtime** — Node AND modern JS runtimes (e.g. Cloudflare Workers);
    stateless servers, queue-driven workers. Enforcement: Workers-FIRST
    development (workerd/wrangler primary, Node verified in CI). Static
    files and theme bundles sit behind platform adapters (FileStore +
    ThemeBundleProvider; Node fs vs wrangler assets binding + statically
    imported precompiled bundles) and the worker runs via src/worker.ts +
    wrangler.jsonc. Remaining violations to fix: in-memory rate
    limiter/queue/mailbox state.
14. **Workflows** — new Automation & Workflows bounded context
    (WorkflowDefinition/WorkflowRun/StepRun) on the job primitives.
    AutomatedEmail is superseded; the welcome series becomes a seeded
    default drip workflow.
15. **Database** — libSQL-family only (libSQL/Turso/D1), per-site. Sends
    are provider-throttled, so delivery writes are not burst-shaped; no
    separate analytics store for now.
16. **Admin UI** — compat facade: v10 exposes Admin/Content/Members API
    surfaces compatible with current Ghost so existing apps (Ember admin
    included) run unmodified; the native v10 API evolves underneath.
17. **Themes** — two paths: gscan-valid Handlebars themes render unmodified
    via a compat helper layer, and headless via Content API with Astro as
    the official modern front-end story.

## 2026-06-10 — doc consolidation

18. The v4 docs were renamed (`prd.md`, `prd-operations.md`,
    `prd-admin-settings.md`, `domainmodel.md`, `architecture.md`) and all
    rulings above were folded into their text. New PRD sections added:
    20 (automation workflows), 21 (theme rendering), 22 (API compat
    facades).
19. The implementation-status checklist is grounded against `phantom/src`.
    Native Hono routes, Drizzle/libSQL tables, service methods, and colocated
    tests are evidence; legacy Ghost test suites are reference inputs only.

## 2026-06-11 — doc relocation

20. All Ghost v10 docs moved from the repo root into `phantom/docs/`. The
    module conventions doc was renamed `module-architecture.md` so the
    system architecture doc could keep the `architecture.md` name.
