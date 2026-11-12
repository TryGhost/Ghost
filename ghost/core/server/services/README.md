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
  `accept.ts` function keeps transaction state local to each invocation; it
  does not need its own service root or lifecycle.
- Magic-link token and URL helpers are reusable support for several workflows,
  not a separately boot-managed capability. They belong in their own library,
  not a mail service merely because some callers send the links by email.

Relocation does not resolve resource ownership by itself. If a supporting
client acquires resources, its owner must still arrange any necessary cleanup.

## Creating a service

After checking [what belongs here](#what-belongs-here), run:

```sh
pnpm gx generate service delivery-receipts
```

The generator creates `index.ts`, a separate `delivery-receipts-service.ts`
implementation, and `ghost/test/unit/server/services/delivery-receipts/index.test.ts`.
The root default-exports `defineService` and injects logging. Commented examples
show where models, settings, config, DomainEvents and other service instances
belong. Import allowlisted libraries directly in the implementation; use
`GhostLogger` for its injected logging type.

The generator does not register the service anywhere. Every service check
applies to a service that is not listed in the
[legacy service inventory](#standard-and-legacy-services), so a new service is
checked from its first commit.

Complete the steps printed by the command:

1. Implement the capability and wire only its required dependencies in the root.
   Preserve live settings reads and explain any deferred dependency lookups.
2. Add and await `require('./server/services/delivery-receipts').default.init()`
   in `ghost/core/boot.js`, after its dependencies are ready and before its
   consumers run. Document those requirements above `defineService`. Consumers
   read `.service` after initialization.
3. Await required startup work before returning the instance. If startup can
   fail after acquiring resources, clean them up before rethrowing. Arrange
   normal shutdown separately when needed.
4. Extend the starter test with behavior, dependency timing, and failure/retry
   coverage. If the root declares extras, [catalogue them](#standard-root-contract).
5. Run the generated root test and the repository checks:

   ```sh
   pnpm nx run ghost:test:unit test/unit/server/services/delivery-receipts/index.test.ts
   pnpm check
   ```

The generator rejects invalid names and existing service or test paths. See the
[gx guide](../../../../tools/gx/README.md#service-generator) for command details and
[initialization](#initialization) below for readiness and resource ownership.

## Implementation and migration

The definition above guides new roots and directory cleanup. Legacy roots
still use different construction and export patterns. Do not assume a legacy
root exports `init`, `service`, and `shutdown`. Migrating one must include the
implementation, boot wiring, and tests, not just a documentation change.

### Standard and legacy services

Every service check applies to every service, unless the service is listed
under `services` in the
[legacy service inventory](legacy-service-inventory.yaml).

A service that is not listed is standard. It must be:

- A directory with an `index.ts` root. The inventory test checks this.
- A root that default-exports the
  [kernel's `defineService` initializer](../../kernel/README.md#service-initialization).
  See the [standard root contract](#standard-root-contract).
- Free of hidden dependencies. See [dependency boundaries](#dependency-boundaries).

[IndexNow](indexnow-ping/index.ts) (`indexnow-ping`) is the example to follow.

The inventory is temporary and boot never reads it. It has two sections:

- `services` lists the legacy services with their audit record and migration
  assessment. It includes standalone files and supporting modules still awaiting
  relocation. This list only shrinks: CI rejects a pull request that adds a name.
- `standard` records what is still open for services that already meet the
  standard. An entry can have only `extras` (the catalogue described in the
  [standard root contract](#standard-root-contract)), `futureHome` and
  `lifecycle`, a list of notes on what `defineService` does not do for the
  service yet. A standard service with nothing open has no entry.

Migrating a service means deleting its `services` entry and its known
violations. Git history keeps the audit record. Move any extra it declares into
the second section.

### Dependency boundaries

The root `index.ts` wires runtime dependencies and passes them to the
implementation. Dependency rules apply to every service, legacy or standard.
Implementation files may import:

- Files within the same service, except its root `index.ts` or `index.js`.
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
`ghost/no-injected-service-libraries`. In root `index.ts` files, it
rejects allowlisted imports and `const require()` bindings passed to constructors
imported from within that service, including values in literal options objects
and arrays. It reads the same allowlist and service scope as the boundary rule.
Factories, forwarding callbacks, indirect aliases and separately assembled
options objects still need review; this is not general data-flow analysis.

Logging, config, settings, models, event buses and other service instances
belong in the root wiring. Nested `index.ts` files are implementation files, not
extra wiring roots. The rule covers static imports, `require()`, literal dynamic
imports and re-exports. All implementation source inside a service is checked, including
nested folders named `test` or `fixtures`. The scan cannot follow a computed
`require()` or `import()` argument, so `import/no-dynamic-require` rejects those
in every service file.

Some dependencies look like libraries but are treated as instances:

- `@tryghost/domain-events` is a process-wide event bus. Roots inject it, and
  the event classes they publish, as [comments](comments/index.ts) and
  [users](users/index.ts) do.
- Implementations don't import `fs`. A root that needs files passes a loader
  limited to those files, like `readTemplate` in the comments root.
- Lodash is allowed only as individual functions, such as `lodash/isEmpty`.
  Plain JavaScript is often simpler.

Require models, the database and other services inside the `create` callback
rather than at module scope, so importing a root doesn't depend on how far boot
has got. Keep each dependency's existing timing:

- When a dependency is set up later in boot, pass a function that looks it up
  on use and say why in a comment.
  [Stripe Checkout config](stripe-checkout-config/index.ts) reaches Stripe,
  tiers and members this way.
- When a setting or config value is read on each use today, pass a function
  rather than the value, as [member attribution](member-attribution/index.ts)
  does for `outbound_link_tagging`. Capturing it in `create` changes when edits
  take effect.
- A dependency loaded with `require()` in a TypeScript root has no type. Keep
  its type with `typeof import()`, as the users root does for post revisions.

Type injected logging as `GhostLogger`, or a `Pick<GhostLogger, ...>` of the
methods used, with `import type { GhostLogger } from '@tryghost/logging'`. In
JSDoc, use `import('@tryghost/logging').GhostLogger`. Do not hand-write a logger
shape; `ghost/prefer-canonical-types` rejects one in Ghost Core and its tests
whatever it is named, and rejects `object` or `any` on an injected logger. Class
tests pass `createLoggingFake()` from `ghost/test/utils/logging-utils` and assert
on its stubs instead of stubbing the global logger;
`ghost/no-real-logger-injection` rejects passing the real one. Exported service
types may not contain `any`.

Where JavaScript has a matching TypeScript sibling, the audit and boundary
checks inspect the TypeScript source and resolve imports back to it. This keeps
adjacent `build:tsc` output out of the report; ordinary JavaScript implementations
remain checked. Package exports resolve through their `source` condition when
available, so workspace contracts are checked without relying on build output.

`pnpm lint:boundaries`, also run by `pnpm check` and CI, checks all service
implementations in the same dependency-cruiser scan as Core and app boundaries.
Top-level `index.ts` and legacy `index.js` files are wiring roots and exempt;
nested indexes and standalone service files are checked. The exemption is the
same for legacy and standard services.

Existing violations are recorded in
[the known-violations file](../../../../.dependency-cruiser-known-violations.json).
Each entry names one rule, importing file and dependency. External packages use
the exact import specifier, including subpaths, so pnpm store locations do not
change the baseline. Local and workspace dependencies use resolved source paths.
Moving either file or adding a new import cannot inherit another entry's exception.

CI rejects new violations, stale entries, duplicate entries and entries for
services that are not legacy. When fixing a violation, remove its entry in the
same change; when migrating a service, remove all its entries with its legacy
entry. Do not regenerate the file to accept new violations. The file should only shrink. Any exceptional
addition or move needs explicit review; CODEOWNERS covers it and the rule config.

A few legacy services change too often for a file-level list to hold: it
would go stale between a pull request opening and merging. Their inventory entry
says `dependencyChecks: deferred`. Their violations stay in reports and in the
lint summary count, but do not fail lint and have no entries in the file. In
those services, still pass new dependencies in through whatever file already
composes the service. The deferral ends when the entry is deleted. CI rejects a
new deferral, and a service that is not listed is checked from its first commit.

The shared [boundary checker](../../../../tools/scripts/lib/dependency-boundaries.ts)
compares the current graph with this file. Native dependency-cruiser baselines
match resolved paths and silently retain stale entries, so they cannot enforce
this contract on their own. `gx services report` and `gx services audit` use the
same scan and file, retaining all current findings so migration reports still
show the remaining work.

The allowlist names individual packages or files, with a reason for each.
Review additions individually; do not allow whole shared directories or all
`@tryghost/*` packages.

When several services make the same call to a library, move that call into one
shared file and allow the file rather than the library.
[`inline-css.ts`](../lib/email-rendering/inline-css.ts) wraps `juice` with the
options all three email renderers used.

### Migration reports

Tools for inspecting progress of the active service migration are available
under `pnpm gx services`. Start with `pnpm gx services report`; see the
[gx guide](../../../../tools/gx/README.md#service-migration-reports) for lists,
per-service details and dependency audits.

### Migration assessment

Each legacy entry has a source-based `migration` assessment:

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
  this assessment, independently of the contract audit's `auditedAt`. Like every
  audit revision, it is a commit on main (see [Audit revisions](#audit-revisions)).

These are migration estimates, not proof that the kernel must change or permission
to redesign a service. Recheck the evidence before implementation. An assessment
neither completes the contract audit nor establishes test coverage or passing tests.

#### Dependency assessment

Legacy entries also record `migration.dependencies`, separately from the
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
  commit on main inspected for this assessment, independently of the overall
  assessment and `auditedAt`.

Use the full dependency audit and inspect source, root wiring and consumers.
The report excludes imports in legacy roots and cannot establish whether a
captured dependency is ready or a deferred lookup must stay deferred. Keep
live settings reads and operation-local state intact when introducing injection.

A newer complex dependency assessment supersedes an older straightforward
overall estimate for planning: that service needs preparation before a small
initializer migration. A straightforward dependency assessment does not establish
an easy lifecycle migration, sufficient test coverage or passing tests. Existing
`blockers` and contract evidence still apply. Recheck the assessment against current
source before use. It is deleted with the entry when the service is migrated.
Do not store report totals in the inventory or infer kernel requirements from
violation counts. Shared primitives need a demonstrated application-independent
contract; feature-specific helpers stay with their owners.

`disposition` records what this migration does with the entry:

- `migrate` adopts the boot-owned initializer in place.
- `relocate` moves code that clearly is not a service and cannot be migrated
  out of this directory. The entry is removed once it moves.
- `split` separates parts with different owners. Its notes name each part's
  owner, which part remains a service, and whether the split must come before
  the initializer migration.
- `review` leaves the decision open.

It does not record completed work. Every root is expected to move into a domain
eventually; that is separate from this migration. A migrated service keeps its
dependency, readiness and lifetime contracts wherever it later moves.

Base disposition on the capability's runtime responsibilities. Per-call
construction, no initializer, a single consumer, or use of another service does
not by itself make a root supporting code. An uncertain long-term home is not a
reason to relocate: code that needs lifecycle management and has no other owner
yet is a `migrate`. If the decision is still open, use `review` and keep
initialization and dependency work applicable.

`futureHome` optionally suggests where an entry might live after this
migration, relative to `ghost`, when its current or planned home is
questionable. Any disposition can have one. It is a suggestion, not a planned
move, and does not block the migration, relocation or split.

Each legacy entry records its intended ownership and audit status. `pending` means
the contract audit has not started; `auditing` means evidence is incomplete;
`audited` means all facets have been investigated and recorded from source or
test evidence. It describes audit completeness, not test coverage or migration
readiness. An audited entry can still have test gaps or known bugs in `blockers`.
The `notes` describe audit priorities and intended changes, not verified contracts.

`auditedAt` is the full SHA of the commit on main the record was last checked
against. Add it when completing or refreshing an audit; older records may
omit it. Advance it only after reviewing relevant changes, not merely
rebasing. Preserve recorded contracts and recheck relevant changes when work
on that service begins. If cited evidence has since been deleted, keep a link
to the file at the audited revision in the summary; `sources` and `tests` list
files that still exist, without implying freshness.

#### Audit revisions

Every `reviewedAt` and `auditedAt` is a commit on main. A branch commit
disappears when its pull request is squash merged, so use the main commit the
branch is based on. Recorded contracts describe that revision plus the changes
in the pull request that last edited the record, which `git log` on the
inventory identifies.

Before relying on a record, compare its service directory and cited
source/test paths with that revision, and check for new callers. Changed
files flag a recheck, apart from changes the recording pull request made. The
reference does not prove tests ran at that revision. Inventory validation
checks its format without requiring Git history; `pnpm gx services verify`
checks that changed revisions are on main.

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

The unit test checks the inventory's shape and paths, and the extras catalogue.
It checks that every legacy entry exists, and that everything else in this
directory is a directory with an `index.ts` root. It reads declared extras
without importing services or driving initialization. Oxlint separately enforces
the public root shape. `README.md` and the inventory itself are the only metadata
exclusions. Retire the inventory after migration; keep the behavioral tests.

Follow an existing service in the same area when extending established code,
without treating its legacy placement or lifecycle shortcuts as requirements.
New standalone service logic should be TypeScript unless it must extend an
existing JavaScript module.

Donations uses a TypeScript default export for its service initializer, while
its implementation keeps named exports. Existing CommonJS callers read
`require('./donations').default`; a CommonJS wrapper is not needed merely
because boot still uses `require()`.

## Standard root contract

Every root that is not a legacy service default-exports a `defineService`
initializer with `init`, a guarded `service` getter, and optional typed `extras`. Type-only named
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

Catalogue every member under the service's `extras` in the inventory's section
for standard services, recording:

- `purpose` and production `callers` (paths relative to `ghost`).
- `timing`, including whether a ready instance is needed and whether configuration
  is read live or at startup.
- `dependencies` and `failurePolicy`, including retry and background-failure behaviour.
- `destination`: the intended future owner or the interface still to be decided.

The Oxlint rule `ghost/service-root-shape` enforces default initializers,
explicit extras and the absence of other runtime exports or container mutations.
It applies to every `services/*/index.ts` and reads the legacy service inventory
for the roots to skip, so a new root needs no registration. Deleting a legacy
entry applies the rule to that root. The separate inventory test requires
declared extras names to match the catalogue exactly. Behavioural tests still establish readiness,
boot ordering, resource cleanup and each extra's semantics.

## Initialization

Ghost's boot sequence owns service construction. A new service root must
default-export the
[kernel's `defineService` helper](../../kernel/README.md#service-initialization)
and have its `init()` awaited from `ghost/core/boot.js` in the appropriate boot
phase. Existing legacy roots keep their shape until migrated. Do not make the
first request responsible for constructing the service.

With `defineService`, the service author supplies a `create` callback that constructs and returns a
ready instance. Boot awaits the root's `init()`; consumers then read `.service`.
The kernel guide describes the full contract, including concurrent calls and
explicit retries after failure.

### What `create` returns

Return one ready instance. When a service is a set of objects built together,
such as an API and its controller, return them as one object with a declared
type, as [Stripe Checkout config](stripe-checkout-config/index.ts) does with
`StripeCheckoutServices`.

`.service` returns that same object for the life of the process, and consumers
may hold on to it. Don't replace it or its members after `init()`.

Keep the service's state on the instance. An extra that needs the ready
instance reads it through the root's `service` getter, as
[signing keys](signing-keys/index.ts) does, rather than keeping a second
module variable with its own guard.

### Startup work and boot order

Await any work callers rely on before returning, such as loading data
(`repository.init()` in [tiers](tiers/index.ts)) or applying a due key rotation
(`check()` in signing keys).

Initialize a root after everything its `create` callback reads. Say what it
needs in a comment above `defineService` and keep that order in `boot.js`. For
example, recommendations reads the Mentions root during `create`, so boot
initializes Mentions first. Roots that don't depend on each other can start
together.

### Failed startup

If startup fails partway through, the `create` callback must release resources
it already acquired before passing the error back. The helper cannot remove the
callback's listeners or close its connections. A retry runs the callback again,
so resources left by the failed attempt could remain active alongside any new
instance.

The simplest approach is to acquire resources last, so nothing after them can
fail. [Mentions](mentions/index.ts) starts listening for events as its final
step. When that isn't possible, undo the partial work before rethrowing. The
[IndexNow callback](indexnow-ping/index.ts) removes any partially registered
listeners before rethrowing a subscription error:

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
