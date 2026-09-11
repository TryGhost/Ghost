# Codebase direction

Ghost is evolving incrementally while continuing to ship. Some of the most
common patterns in the repository are legacy patterns rather than examples to
copy into new code.

Ghost 7.0 is planned for the first half of 2027. The work on this page shapes
the codebase leading up to that release.

This guide records the direction of the codebase and what contributors should
do now. It is not a roadmap or a promise to migrate everything at once. When a
focused guide exists, follow that guide for implementation details.

## Main priorities

Our two most important priorities are:

1. **React:** move Ghost Admin onto React and off Ember.
2. **Type safety:** move the codebase to TypeScript and validate runtime
   boundaries with Zod.

## Status terms

- **Active migration** means new work follows the new path while existing code
  moves over in coherent pieces.
- **Exploring** means the direction is agreed and work is underway to figure
  out the implementation pattern.
- **Planned** means a concrete change is committed, but the migration has not
  started yet.

## Direction at a glance

| Area                 | Direction                                            | Status           |
| -------------------- | ---------------------------------------------------- | ---------------- |
| Admin UI             | Ember to React                                       | Active migration |
| Application code     | JavaScript to TypeScript                             | Active migration |
| Node.js modules      | CommonJS to ESM                                      | Active migration |
| Runtime boundaries   | Validate unknown data with Zod                       | Exploring        |
| Server dependencies  | Inject stateful dependencies                         | Exploring        |
| Data access          | Bookshelf to services, repositories, and Knex        | Exploring        |
| Server state         | Interchangeable, stateless instances                 | Active migration |
| Repository layout    | Consolidate related projects into the monorepo       | Active migration |
| Development patterns | Establish golden paths for recurring work            | Exploring        |
| Database support     | Remove SQLite support in Ghost 7.0                   | Planned          |
| Editor content       | Remove Mobiledoc support in Ghost 7.0                | Planned          |
| Self-hosting         | Deprecate Ghost-CLI in favour of Docker in Ghost 7.0 | Active migration |
| Node.js runtime      | Keep pace with Node Current                          | Planned          |
| Authentication       | Standards-based auth built on Better Auth            | Exploring        |
| Linting              | ESLint to Oxlint                                     | Planned          |

## Architectural direction

The following decisions give new work a review direction without pretending
that every migration path is settled:

- **Stateless Ghost:** application instances for a site should be
  interchangeable. New work should reduce reliance on local files,
  process-local state, and boot-time snapshots.
- **Dependency injection:** modules should be handed the stateful things they
  use. Wiring moves toward the edge; this does not require a DI framework or
  prohibit ordinary imports.
- **Type safety:** TypeScript is the language direction and Zod is the runtime
  boundary direction. Exact schema ownership and sharing patterns still need
  golden paths where the codebase has no established answer.
- **Golden paths:** recurring work should have one obvious, supported route
  embodied in code, templates, tooling, tests, documentation, and agent
  guidance. Laravel is a reference for the quality and completeness of that
  experience, not a framework to copy.
- **Modern authentication:** authentication should converge on standard
  protocols and credential lifecycles, with Better Auth as the intended
  foundation. Existing staff, member, integration, and Content API mechanisms
  remain the current contract until replacements are implemented and migrated.
  Follow the [authentication guide](authentication.md) for current behavior.

## Guidance for new work

### Build Admin features in React

Build new Admin UI in [`apps/admin/`](../../apps/admin/) with
`admin-x-framework` for API access and Shade for UI. Do not add a new Ember
route or use Ember merely because an older version of the feature does.

Migrate an existing Ember feature at a coherent product boundary. React and
Ember still ship together, so preserve navigation, authentication, shared
state, and older-server behavior across the bridge. The
[Admin README](../../apps/admin/README.md) describes the current integration.

### Use TypeScript

Write new product code in TypeScript where the surrounding runtime supports
it. Use types to model the domain rather than replacing uncertainty with
`any`, unchecked assertions, or `@ts-nocheck`.

Use your judgement when deciding whether to convert existing files. A small,
unrelated change may not justify a migration. When working substantially in an
area, take the opportunity to migrate it where feasible. Prefer converting a
coherent module or directory together, with its tests, rather than leaving a
mixture of JavaScript and TypeScript. Preserve the behavior of callers that
have not yet migrated.

### Use ESM at supported boundaries

New internal packages are TypeScript-only ESM packages. Follow the
[internal package golden path](../../packages/README.md) rather than adding a
CommonJS build by default.

Ghost Core still contains CommonJS entry points and consumers. New TypeScript
services can use ESM internally while retaining a thin CommonJS wrapper where
an existing `require()` boundary needs one. Do not convert a public package or
established runtime boundary without checking its consumer and release
contract.

### Validate runtime boundaries

TypeScript cannot prove the shape of data arriving over HTTP, from the
database, configuration, files, queues, or third-party services. Treat that
data as `unknown` until it has been validated. Zod is the preferred runtime
schema and validation library for new boundaries, and TypeScript types should
be inferred from the schema where practical.

There is not yet one settled layout for schemas shared across every part of
Ghost. Follow a proven nearby implementation, keep one source of truth for a
shape, and avoid adding competing handwritten validation and type definitions.
Ordinary internal function calls do not need runtime validation when
TypeScript already controls both sides.

### Put behavior in services and data access in repositories

For a new server feature, put domain behavior in a TypeScript service. We are
exploring repositories and direct Knex as the replacement for Bookshelf, but
the complete data-access pattern is not settled yet. Do not create a new
Bookshelf model or add new business logic to model lifecycle hooks.

Existing features still depend heavily on Bookshelf. When working in one, move
behavior behind an explicit service or repository seam before replacing its
persistence. Do not bypass existing behavior simply to avoid the model.

Pass stateful dependencies such as database connections, models, caches,
configuration, and I/O services into new modules. Construct and connect them at
the application edge. Pure functions, constants, and types can still be
imported normally; dependency injection does not require a container. Follow
the [services guide](../../ghost/core/core/server/services/README.md) for the
current construction and initialization pattern.

### Avoid new process-local state

Design new server behavior so any Ghost instance for a site can serve the next
request. Do not make local files, startup-only precomputation, module singletons,
or uncoordinated in-memory state the source of truth.

An in-memory cache can still be appropriate when it can be rebuilt from a
shared source and does not require instances to synchronize. The practical
test is whether restarting or switching the serving instance loses data or
breaks behavior. See the [runtime architecture](runtime-architecture.md) and
[internal caching](internal-caching.md) guides for the current boundaries.

## Compatibility and infrastructure transitions

### Ghost 7.0

Ghost 7.0 is planned to deprecate Ghost-CLI in favour of Docker for
self-hosting, and to remove support for Mobiledoc and SQLite. Until then,
preserve the existing contracts where they are still supported, but do not
build new features around them.

### SQLite

Ghost currently supports SQLite through `better-sqlite3`, with the old
`sqlite3` configuration name retained for compatibility. SQLite support is
planned to be removed in Ghost 7.0. Do not add new SQLite-specific behavior or
assume SQLite will remain a supported production database.

### Node.js

Ghost currently supports Node.js 22 and 24. CI tests both supported lines, and
new code and dependencies must work on both. The longer-term direction is to
keep pace with Node Current, but dropping an existing version is an explicit
compatibility and release decision.

Check the [Node.js compatibility table](../reference/node-compatibility.md)
instead of inferring support from the version installed locally.

## Working in transitional code

- Do not assume the most numerous pattern is the preferred pattern.
- Do not expand a legacy dependency when a supported new path exists.
- Migrate a coherent boundary, including its tests and compatibility behavior,
  rather than mixing broad cleanup into an unrelated change.
- Preserve old and new paths where an incremental migration requires both.
- Treat an agreed direction as a design constraint, not permission to invent a
  local framework. If the implementation pattern is unclear, establish it
  before copying it across the codebase.
- Update this guide when work moves between stages, a migration completes, or a
  planned tool becomes authoritative.
