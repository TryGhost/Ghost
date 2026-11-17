# Boot

Boot composes Ghost: it chooses what the application runs with and hands it to
the code that uses it. [`boot.js`](../boot.js) runs the startup phases. This
directory holds composition modules, one per capability, that those phases use.

A module belongs here when it configures
[kernel machinery](../kernel/README.md) for Ghost: it supplies Ghost's
registry, configuration and paths, and builds the instance. Features and
business rules stay with their owners, and a service still has its root in
[`server/services`](../server/services/README.md).

## Adapters

[`adapters/`](adapters/index.ts) builds Ghost's one configured
[adapter manager](../kernel/README.md#adapter-manager) from:

- [`base-classes.ts`](adapters/base-classes.ts): the base class each adapter
  type must extend.
- [`adapter-paths.ts`](adapters/adapter-paths.ts): where adapters are looked
  up, in order.
- [`config.ts`](adapters/config.ts): Ghost's configuration in the shape the
  manager resolves lookups from, including the legacy `storage` and
  `scheduling` blocks.

`boot.js` validates the configured adapters with `init()` before anything uses
one.

Most consumers still look adapters up through
[`server/services/adapter-manager`](../server/services/adapter-manager/index.ts),
which re-exports the instance. That path is being removed: do not add imports
of it. New code receives its adapter from boot.
