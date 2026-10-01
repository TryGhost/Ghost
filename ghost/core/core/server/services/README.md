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
  `server/lib/`, grouped by a specific capability rather than a miscellaneous
  `services/lib/` directory.
- Put HTTP routing and middleware in the appropriate part of `server/web/`.
- Keep API-specific support with its API owner rather than making it a service.

For example:

- `email-service` exposes an application-owned wrapper initialized during boot;
  `mail` exports `GhostMailer` for callers to construct and a template helper.
  The latter is mail support, not a service root, even though sending mail has
  side effects. Its remaining placement here is legacy, not a pattern to copy.
- `email-address` constructs and exposes the application's email-address
  implementation through `init()` and `service`. It qualifies without owning a
  background worker.
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

Follow an existing service in the same area when extending established code,
without treating its legacy placement or lifecycle shortcuts as requirements.
New standalone service logic should be TypeScript unless it must extend an
existing JavaScript module.

The gifts, donations, and related services show the current transition pattern:
domain logic uses TypeScript with named exports, while a thin CommonJS
`index.js` or wrapper remains only where boot code or an existing `require()`
boundary needs it.

## Initialization

Ghost's boot sequence owns service construction. A new service that requires
initialization must expose an explicit `init()` and be called from
`ghost/core/core/boot.js` in the appropriate boot phase. Do not make the first
request responsible for constructing the service.

Keep wrapper initialization idempotent when callers may safely reach it more
than once. Add shutdown or cleanup handling to the boot lifecycle when the
service owns resources that must be released.

## Related guidance

- [Monorepo structure](../../../../../docs/codebase/monorepo-structure.md)
- [Configuration](../../../../../docs/codebase/configuration.md)
- [Database migrations](../../../../../docs/practices/database-migrations.md)
- [API design](../../../../../docs/practices/api-design.md)
- [Error handling](../../../../../docs/practices/error-handling.md)
