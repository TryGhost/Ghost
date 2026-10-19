# Ghost Core services

Services under this directory own domain and integration logic used by Ghost
Core through application-owned instances. The directory is a catalogue of
runtime services, not a general home for all server-side business logic or I/O.
Use the definition below when adding or relocating a top-level entry; existing
placement alone is not evidence that something belongs here.

## What belongs here

A service root is the application entry point for a capability whose instance,
dependencies, and availability are owned by Ghost's boot lifecycle. It wires
an implementation for callers to use, rather than merely exporting a class
for callers to construct themselves.

This includes both:

- **Resource-owning services**, which need lifecycle coordination for work such
  as event subscriptions, scheduled jobs, or resources requiring cleanup.
- **Composition-only services**, which assemble dependencies and expose an
  application-owned instance without needing background work or a stop hook.

Having a timer or a shutdown method is not a prerequisite. Equally, performing
I/O, reading configuration, containing business rules, or having a large
implementation does not by itself make a module a service root. Do not add an
empty lifecycle wrapper just to justify a directory's location.

These rules apply to top-level entries, not every file inside a service. A
service can own ordinary classes, repositories, functions, types, templates,
and provider adapters as private implementation details.

### Supporting code and other homes

- Keep implementation used only by one service inside that service.
- Put shared server libraries, reusable constructors, and provider clients in
  `server/lib/`, grouped by a specific capability.
- Put data export implementations with the [data exporters](../data/exporter/README.md).
  Caller-constructed archive builders belong there with their component definitions.
- Put HTTP routing and middleware in the appropriate part of `server/web/`.
- Keep API-specific support with its API owner rather than making it a service.
- Keep the existing authentication subsystem together in
  [`server/auth/`](../auth/README.md) while its longer-term ownership is settled.
  Relocation preserves its current composition and does not complete lifecycle work.

For example:

- `email-service` exposes an application-owned wrapper initialized during boot.
- `email-address` constructs and exposes the application's email-address
  implementation through `init()` and `service`. It qualifies without owning a
  background worker.
- Staff invitation acceptance is a domain action owned by `invites`. Its
  `accept.js` function keeps transaction state local to each invocation; it
  does not need its own service root or lifecycle.
- Magic-link token and URL helpers are reusable support for several workflows,
  not a separately boot-managed capability. They belong in their own library,
  not a mail service merely because some callers send the links by email.

Relocation does not resolve resource ownership by itself. If a supporting
client acquires resources, its owner must still arrange any necessary cleanup.

## Implementation and migration

The definition above guides new roots and directory cleanup. Existing roots
still use different construction and export patterns; a uniform managed
lifecycle interface is not yet the implemented contract throughout this
directory. Do not assume every root exports `init`, `service`, and `shutdown`.
Standardizing that interface must include the implementation, boot wiring, and
tests, not just a documentation change.

The temporary [service inventory](service-inventory.yaml) tracks this migration.
Update it when adding, removing or renaming a root. It includes standalone
files and supporting modules still awaiting relocation. Boot never reads it.

Entries marked `migrated: true` use the
[kernel's `defineService` initializer](../../kernel/README.md#service-initialization).
The inventory's `exemplaryMigration` points to IndexNow as the example to follow.
The marker tracks adoption independently of audit completeness or remaining
lifecycle work.

### Dependency boundaries

For migrated services, the root `index.ts` wires runtime dependencies and passes
them to the implementation. Other files in that service may import:

- Files within the same service, except its root `index.ts`.
- Types, using explicit type-only imports.
- The libraries and individual shared files in the
  [dependency-cruiser config](../../../../.dependency-cruiser.cjs).

The shared [clock](../../kernel/clock.ts) is allowed directly, including its
deprecated `moment` export for existing date logic. Service migration does not
require rewriting those date operations.

Import allowlisted libraries directly where they are used; do not pass the
library or its exports through the service's dependencies. Local use in the
root is fine, including validating configuration with Zod and passing computed
values such as `getUnixTime()`.

`pnpm lint:oxlint` enforces direct constructor wiring with
`ghost/no-injected-service-libraries`. In migrated root `index.ts` files, it
rejects allowlisted imports and `const require()` bindings passed to constructors
imported from within that service, including values in literal options objects
and arrays. It reads the same allowlist and service scope as the boundary rule.
Factories, forwarding callbacks, indirect aliases and separately assembled
options objects still need review; this is not general data-flow analysis.

Logging, settings, models, event buses and other service instances belong in the
root wiring. Nested `index.ts` files are implementation files, not extra wiring
roots. The rule covers static imports, `require()`, literal dynamic imports and
re-exports. All implementation source inside a service is checked, including
nested folders named `test` or `fixtures`.

Where JavaScript has a matching TypeScript sibling, the audit and boundary
checks inspect the TypeScript source and resolve imports back to it. This keeps
adjacent `build:tsc` output out of the report; ordinary JavaScript implementations
remain checked. Package exports resolve through their `source` condition when
available, so workspace contracts are checked without relying on build output.

`pnpm lint:boundaries`, also run by `pnpm check` and CI, enforces these rules as
errors for every entry marked `migrated: true`. New implementation files inherit
the same rules. Marking a service migrated opts it into enforcement; review
changes to that marker as part of the migration.

The allowlist names individual packages or files, with a reason for each.
Review additions individually; do not allow whole shared directories or all
`@tryghost/*` packages.

To inspect the remaining work across **all** entries:

```bash
pnpm audit:services
pnpm --silent audit:services:summary
pnpm audit:services --output-type json --output-to /tmp/service-dependencies.json
```

The command enables `GHOST_SERVICE_DEPENDENCY_AUDIT` to apply the same rules to
all entries, including those absent from the inventory. It uses Dependency
Cruiser's built-in terminal report, with Markdown and JSON also available.
The audit returns success even when it finds violations; the normal lint
command fails on violations in migrated services. Reports list source files and
dependency targets, without custom inventory grouping. Legacy root `index.js`
files are treated as wiring
candidates; imports there do not prove readiness for migration.

The optional summary requires `jq`. It groups `service-dependencies` findings
by dependency and counts distinct importing implementation files, largest first.
Multiple imports of the same target in one file count once. It does not include
unresolved-import or own-root findings; use the detailed audit for those.

Counts in the detailed report describe rule violations; one import can appear
under more than one rule. Review whether each dependency needs injection, a
library allowance or an ownership change. Computed paths such as `require(name)` cannot be resolved
by this static check and are not separately scanned. Unresolved imports,
globals, runtime state and initialization behavior still need tests and review.

### Migration assessment

Each entry also has a source-based `migration` assessment:

- `complexity: straightforward` means bounded factory, export and boot-order changes.
  `complex` means substantial ownership, dependency, failure or lifetime work;
  unresolved service ownership belongs here too. `not-applicable` is reserved for
  confirmed supporting code being relocated.
- `modelImpact: fits` means one retained ready instance fits the capability, even
  when migration is complex. `may-change` identifies a concrete model question,
  such as restart, replacement or dependency cycles; it requires `complex`.
  Non-services use `not-applicable` for both dimensions.
- `reason` explains the decision; `sources` points to existing source or test files
  relative to `ghost`. `reviewedAt` records the full source commit inspected for
  this assessment, independently of the contract audit's `auditedAt`.

These are migration estimates, not proof that the kernel must change or permission
to redesign a service. Recheck the evidence before implementation. An assessment
neither completes the contract audit nor establishes test coverage or passing tests.
Migrated services cannot be classified as `not-applicable`.

#### Dependency assessment

Unmigrated entries also record `migration.dependencies`, separately from the
earlier overall migration assessment above:

- `complexity: straightforward` means dependencies are already explicit or can
  move to root wiring through bounded constructor or factory changes. This can
  still require several imports and caller updates.
- `complexity: complex` means wiring depends on resolving a cycle, shared or
  duplicated composition, ownership, or the timing of dependency access. The
  `reason` names the concrete coupling; a large import count alone is insufficient.
- `not-applicable` is only for confirmed non-services being relocated. An
  unresolved ownership question does not qualify.
- `preparation` lists proposed steps to make the dependency boundary explicit;
  an empty list means no separate preparation was identified. These are not
  implemented changes or permission to redesign the capability.
- `sources` lists evidence relative to `ghost`. `reviewedAt` identifies the
  source revision inspected for this assessment independently of the overall
  assessment and `auditedAt`.

Use the full dependency audit and inspect source, root wiring and consumers.
The report excludes imports in legacy roots and cannot establish whether a
captured dependency is ready or a deferred lookup must stay deferred. Keep
live settings reads and operation-local state intact when introducing injection.

A newer complex dependency assessment supersedes an older straightforward
overall estimate for planning: that service needs preparation before a small
initializer migration. A straightforward dependency assessment does not establish
an easy lifecycle migration, sufficient test coverage or passing tests. Existing
`blockers` and contract evidence still apply. Preserve this assessment as historical evidence
when marking a service migrated; recheck it against current source before use.
Do not store report totals in the inventory or infer kernel requirements from
violation counts. Shared primitives need a demonstrated application-independent
contract; feature-specific helpers stay with their owners.

`disposition` records the intended home of the current directory entry:
`retain` keeps it here, `relocate` plans a move or split between other owners,
and `review` leaves ownership undecided. It does not record completed work.
A relocated capability can still be a configured runtime service; relocation
does not make its initialization assessment `not-applicable`. Keep the entry
until the directory actually leaves, and preserve its dependency, readiness
and lifetime contracts at the destination. Use `notes` to describe the intended
split and distinguish it from an earlier in-place migration assessment.

Base disposition on the capability's responsibilities and intended owner. Per-call
construction, no initializer, a single consumer, or use of another service does
not by itself justify relocation. A feature-owned target list or an extractable
helper also does not settle ownership of the whole root. If the owner is
undecided, use `review` and keep initialization and dependency work applicable.

Each entry records its intended ownership and audit status. `pending` means
the contract audit has not started; `auditing` means evidence is incomplete;
`audited` means all facets have been investigated and recorded from source or
test evidence. It describes audit completeness, not test coverage or migration
readiness. An audited entry can still have test gaps or known bugs in `blockers`.
The `notes` describe audit priorities and intended changes, not verified contracts.

`auditedAt` is the full source commit SHA the record was last checked
against. Add it when completing or refreshing an audit; older records may
omit it. Advance it only after reviewing relevant changes, not merely
rebasing. Recorded contracts describe that revision. Preserve them and recheck
relevant changes when work on that service begins. If cited evidence has since
been deleted, keep a link to the file at the audited revision in the summary;
`sources` and `tests` list files that still exist, without implying freshness.

Before relying on a record, compare its service directory and cited
source/test paths with that revision, and check for new callers. Changed
files flag a recheck; the reference does not prove tests ran at that
revision. Inventory validation checks its format without requiring Git
history.

The `unverified` facets are open questions:

| Facet         | Question to resolve                                              |
| ------------- | ---------------------------------------------------------------- |
| exports       | What runtime exports and import conventions do callers use?      |
| construction  | Where are instances constructed, including deep imports?         |
| consumers     | Which application, request, job or CLI callers use them?         |
| startup       | What must be ready before each supported use?                    |
| lifetime      | What identity and state survive initialization or restart?       |
| configuration | Which values stay live and which are captured?                   |
| resources     | Who owns, drains and releases resources, including nested ones?  |
| failures      | Which failures abort, continue, retry or disable the capability? |

Recorded summaries link to source and test evidence using paths relative to
`ghost`. Entry points are relative to this services directory and include
separate composition paths reached through deep imports. They are not a list
of every importable helper, type or job definition. An empty test list means
the summary has source evidence only, unless it links historical tests. A nonempty
list does not imply that every claim is tested: when coverage is partial, the
summary must say what the cited tests assert and which claims are source-only. Keep established source facts
under `contracts`; reserve `unverified` for questions the audit has not answered.

Record missing coverage and known bugs in `blockers`. Before changing a service,
address the gaps relevant to that change; neither `audited` nor a passing
inventory check proves that its behavior is protected against regressions.

The unit test checks the inventory's shape, example, paths, directory coverage
and extras catalogue. It reads declared extras without importing services or
driving initialization. Oxlint separately enforces the public root shape. `README.md` and the inventory
itself are the only metadata exclusions. Retire the inventory after migration;
keep the behavioral tests and carry the established service convention check
forward independently of the catalogue.

Follow an existing service in the same area when extending established code,
without treating its legacy placement or lifecycle shortcuts as requirements.
New standalone service logic should be TypeScript unless it must extend an
existing JavaScript module.

Donations uses a TypeScript default export for its service initializer, while
its implementation keeps named exports. Existing CommonJS callers read
`require('./donations').default`; a CommonJS wrapper is not needed merely
because boot still uses `require()`.

## Migrated root contract

Roots marked `migrated: true` default-export a `defineService` initializer with
`init`, a guarded `service` getter, and optional typed `extras`. Type-only named
exports are allowed; other runtime exports belong in `extras` during migration.
Implementation files may still export their classes and supporting contracts.

Use the kernel helper directly, or default-export a local `const` created by it:

```ts
const extras = { isAvailable };
export default defineService('Example', createService, extras);
```

Declare extras as an explicit object literal, directly or through a local `const`.
Use named helper references or function definitions; do not invoke helpers or
construct extra instances on import. Do not mutate declared extras or spread, reconstruct or extend an
initializer: spreading it evaluates the guarded getter before initialization.

Extras are a temporary home for concerns whose shared interfaces are not yet
established. They do not imply readiness or automatic invocation by boot.
Availability, request identity conversion and later background activation have
different callers and timing requirements; putting them in one object does not
change their behaviour or ownership.

Catalogue every member under the service's `extras` inventory entry, recording:

- `purpose` and production `callers` (paths relative to `ghost`).
- `timing`, including whether a ready instance is needed and whether configuration
  is read live or at startup.
- `dependencies` and `failurePolicy`, including retry and background-failure behaviour.
- `destination`: the intended future owner or the interface still to be decided.

The Oxlint rule `ghost/service-root-shape` enforces default initializers,
explicit extras and the absence of other runtime exports or container mutations.
Its configuration lists migrated roots explicitly; a tooling test keeps that list
in sync with `migrated: true` in the inventory. Update `.oxlintrc.json` when marking
a root migrated. Legacy roots remain outside the rule until migrated. The separate inventory test requires declared extras
names to match the catalogue exactly. Behavioural tests still establish readiness,
boot ordering, resource cleanup and each extra's semantics.

## Initialization

Ghost's boot sequence owns service construction. A new service that requires
initialization must expose an explicit `init()` and be called from
`ghost/core/boot.js` in the appropriate boot phase. Do not make the first
request responsible for constructing the service.

For a root using the [kernel's `defineService` helper](../../kernel/README.md#service-initialization),
the service author supplies a `create` callback that constructs and returns a
ready instance. Boot awaits the root's `init()`; consumers then read `.service`.
The kernel guide describes the full contract, including concurrent calls and
explicit retries after failure.

If startup fails partway through, the `create` callback must release resources
it already acquired before passing the error back. The helper cannot remove the
callback's listeners or close its connections. A retry runs the callback again,
so resources left by the failed attempt could remain active alongside any new
instance.

For example, the [IndexNow callback](indexnow-ping/index.ts) removes any partially
registered listeners before rethrowing a subscription error:

```ts
try {
  service.subscribeEvents();
} catch (error) {
  service.unsubscribeEvents();
  throw error;
}
return service;
```

Its [startup test](../../../test/unit/server/services/indexnow-ping/index.test.ts)
checks that failure removes only that attempt's listeners and that a later
`init()` succeeds without duplicate subscriptions. Cover the equivalent failure
and retry behavior when a callback acquires resources.

Keep wrapper initialization idempotent when callers may safely reach it more
than once. Arrange normal shutdown separately through the boot lifecycle when
the service owns resources that must be released.

## Related guidance

- [Monorepo structure](../../../../docs/codebase/monorepo-structure.md)
- [Configuration](../../../../docs/codebase/configuration.md)
- [Database migrations](../../../../docs/practices/database-migrations.md)
- [API design](../../../../docs/practices/api-design.md)
- [Error handling](../../../../docs/practices/error-handling.md)
