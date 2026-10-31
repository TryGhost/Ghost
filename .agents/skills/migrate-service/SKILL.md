---
name: migrate-service
description: Migrate one existing Ghost Core service to the boot-owned defineService pattern. Use when asked to migrate or prepare an individual service, including its dependency wiring, consumers, inventory and enforcement. Establish coverage first and keep the initializer migration to one service and one commit.
---

# Migrate one service

Prepare a small, behavior-preserving migration of one existing service. This is
an execution workflow, not permission to redesign a service's lifecycle. The
[services guide](../../../ghost/core/server/services/README.md) is the authoring
guide; read it rather than copying an earlier migration blindly.

## 1. Establish the starting point

- Read the root and nearest `AGENTS.md`, the
  [services guide](../../../ghost/core/server/services/README.md),
  [kernel contract](../../../ghost/core/kernel/README.md#service-initialization),
  [testing guide](../../../docs/contributing/testing.md) and
  [contribution workflow](../../../docs/contributing/workflow.md).
- Inspect status, existing branches/worktrees and related PRs. Preserve unrelated
  work. Fetch `origin` and start from current `origin/main`; refresh dependencies
  with `pnpm bootstrap` in a fresh checkout or after dependency changes.
- Read this service's entry in
  `ghost/core/server/services/service-inventory.yaml` and any existing migration
  plan. If a plan-registry skill is available, use it to find/update that plan;
  do not create a competing plan in the repository.
- Verify prerequisites are merged. An open tests or enforcement PR is not main.
  Preparation can proceed against a proposed policy, but record its exact head
  and repeat validation against the policy that actually merges.

## 2. Audit the whole service and its callers

Use `rg` across production and tests. Include deep imports, nested helpers,
separate actions, job handlers, CLI use and CommonJS consumers. Also inspect
shared boot harnesses and tests that construct routers or renderers indirectly;
a search for the service name alone misses those fixtures. Record:

- Existing runtime/type exports and the intended instance and extras surfaces.
- Who constructs each instance and whether consumers capture it during import.
- Dependencies acquired at import, boot, request, dispatch and job execution.
- Configuration captured once versus read again for each operation.
- Shared identity, caches, pending/rejected promises and invalidation semantics.
- Resource ownership, partial-startup cleanup, normal shutdown and failure policy.

Confirm the capability belongs in services. A reusable constructor or helper
without an application-owned instance belongs elsewhere; do not add an empty
initializer merely to keep its directory.

Read `.dependency-cruiser.cjs` and `.oxlintrc.json` on the actual base. The
`service-dependencies` rule covers every implementation file in the directory,
not just the main class. Only the top-level wiring `index.ts` is exempt.
Implementations must not retrieve collaborators through their own root.

Wire application instances, models, logging, `DomainEvents` and configured
adapters in the root. The guide's dependency boundaries cover `fs`, lodash,
deferred lookups and live configuration reads.
Keep approved libraries imported where used and use explicit type-only imports.
Type injected logging as `GhostLogger` (or a `Pick` of it) from
`@tryghost/logging`, never a hand-written shape; class tests inject
`createLoggingFake()` from `ghost/test/utils/logging-utils` rather than stubbing
the global logger.
Do not inject stateless utilities to evade the policy or duplicate shared helpers.

Inspect the source before adding a library allowance. Justify why the dependency
is a library rather than an application-owned instance, and allow only its exact
entry or file. Include the reason and a boundary regression in the migration PR
that needs the allowance. Assert each rejected target as well as its rule and
source in boundary regressions. Keep allowances out of standalone skill/tooling
PRs.
Seek review when that distinction is unclear or a broader policy change is
needed; do not widen the rule merely to make lint pass. Normal inventory and
root-shape opt-ins still belong in each migration.

Preserve late acquisition with getters/factories when dependencies are unavailable
at boot. Inspect `pnpm gx services report <name>` and the full
`pnpm gx services audit` output: a summary may omit unresolved/own-root imports.

## 3. Establish coverage before changing production

Map each proposed change to an existing behavioral assertion. Run the relevant
unchanged root/implementation tests and real consumer checks on the base.
Use the testing guide's focused Nx commands: they prepare workspace builds and
Core assets before running the selected files. Direct Vitest or `test:single`
commands skip those prerequisites; `pnpm bootstrap` alone does not supply them.
Treat missing package outputs or card manifests as setup failures. Do not compile
Core merely to supply workspace outputs: adjacent emitted JavaScript can shadow
TypeScript edits in CommonJS consumers.
Initialization complexity, an audited inventory entry or an old green result
is not proof of coverage. If a test reloads CommonJS modules, restore the loaded
consumer chain too: cached consumers can retain a discarded root or collaborator.
Run those suites with their neighboring consumers in one worker to check isolation.

Cover the real risk: retained consumers, configuration timing, transaction or
cache behavior, boot ordering and resource cleanup. Use existing cold-boot
HTTP/job coverage where it already proves readiness. Do not copy a boot harness
for every service or duplicate generic kernel concurrency/retry tests.
For async ordering tests, verify both a missing required await and a harmless
extra await: the first must fail and the second must pass. Avoid checks that
count microtask turns; follow the testing guide's async-ordering advice.

If a needed assertion is absent, prepare passing characterization against the
old implementation in a tests-only PR and merge it first. Keep one commit per
service in preparatory batches. If a test exposes a production bug, isolate the
fix ahead of initializer adoption; do not change expectations to hide it.
Update each prepared service's inventory evidence in that tests-only change,
citing the new tests and narrowing only the blockers they cover. Preserve
historical audit revisions; do not defer this evidence to initializer adoption.

Substantial dependency refactors, fixture rewrites and business changes are also
preparation work, separate from the minimal initializer PR. Preserve the old
public API during preparation. Small dependency wiring can accompany migration
when existing tests protect it.

## 4. Make the smallest initializer change

- Create a TypeScript top-level `index.ts` default-exporting `defineService`
  from the kernel. Return one fully ready instance from its factory, or one
  typed object when several objects are built together.
- Expose normal operations on `.service`. Keep classes and implementation
  contracts in implementation files; root named exports are type-only.
- Use optional `extras` only for justified transitional concerns. Catalogue each
  helper's purpose, callers, timing, dependencies, failure policy and destination.
  Extras are not automatic lifecycle hooks or a substitute for readiness.
- Boot calls and **awaits** `init()` in the appropriate phase, even for a
  synchronous factory. Initialize before eager consumers read `.service`.
  Importing a root early is fine; evaluating its guarded getter early is not.
- Adapt every production consumer. Retain CommonJS `.default` at existing
  boundaries; do not convert boot wholesale or add a wrapper solely for it.
- Preserve receivers when forwarding methods. Keep validation at the same public
  boundary and preserve synchronous throws versus promise rejections where
  callers depend on that distinction.
- Keep config reads, external operations, jobs and per-operation resources at
  their established times. Do not make the first request initialize the service.
- If startup acquires resources, clean up that attempt before rejecting. Do not
  dispose borrowed shared resources or change normal shutdown ownership.

If the service requires new kernel features, a restart/replacement policy, an API
redesign or broad boot orchestration, record the concrete mismatch and separate
that decision from the small migration. Do not silently expand its scope.

Migration tests may receive mechanical import/type/stub and initializer-await
adaptations. New behavioral assertions or substantial harness changes return to
preparation. The only new cases permitted in the migration commit are boundary
regressions for new exact dependency allowances. Never weaken assertions,
coverage gates, lint or types to make the refactor pass.

## 5. Update metadata and verify

Update this service's inventory entry: `migrated`, entry points, evidence,
contracts, extras and remaining gaps. Repair affected file references and
startup-order descriptions in other entries mechanically, without changing
their unrelated assessments.
Preserve historical audit provenance;
record the inspected base and distinguish old evidence from new validation.
Do not restore manual totals or erase unrelated backlog items.

Opt the root into `ghost/service-root-shape` in `.oxlintrc.json` as required by
the current configuration; the tooling scope check must agree with the inventory.
`migrated: true` also opts implementations into the boundary checks. Do not claim enforcement passed if that policy was
only checked in a temporary integration or is still awaiting merge.

Run focused tests before/after, relevant real consumer/DB checks, root-shape and
inventory validation, lint/typechecks and the default `pnpm check`. Run one full
local validation at a time. Investigate failures from fresh output; a passing
retry or an unchanged file alone does not establish that a failure belongs to
main. Keep unrelated fixes out of the migration.

Review the final diff: one service, unchanged operation behavior, no hidden
composition, and only justified metadata/enforcement changes. New test cases
are limited to boundary regressions for new exact dependency allowances.
Use the repository commit skill and make **one commit for this service**.
Keep unrelated tooling/skill changes on their own branch. Report the branch,
commit, validation and unresolved prerequisites. Push/open a PR only within the
user's authorization, rebase on fetched main before opening, and report current
CI/review state accurately. Do not merge or enable auto-merge implicitly.
