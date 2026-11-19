# Shared modules

A shared module is something every service may rely on: limits, settings,
signing keys, i18n. It starts in the shared step of Ghost's start sequence,
after the database is ready and before any service. This folder is not
[`core/shared`](../core/shared), which is legacy.

## The rules

- A shared module is a folder here, `ghost/shared/<name>/`, written in
  TypeScript: an `index.ts`, its implementation, nothing else. Its tests are in
  [`test/unit/shared/<name>/`](../test/unit/shared).
- `index.ts` default-exports a root made with
  [`defineService`](../../kernel/README.md#service-initialization). A module
  with nothing to start still has a root.
- It is **given** what it needs and imports none of it. The root's `create` and
  `start` receive `{ foundation, …needs }`: the
  [foundation](../../kernel/src/foundation.ts) (config, logger, database
  handle, event bus) and the instances of the earlier shared modules it names.
  It imports no application code, no other shared module, and no package that
  holds an instance. Types may be imported from anywhere.
- The order is the explicit list in
  [`bootstrap/shared.ts`](../bootstrap/shared.ts). An entry names the module
  and what it is given:

  ```ts
  { name: 'settings', load: () => require('../shared/settings').default, needs: ['limits'] },
  ```

- `create` builds the instance once per process. What must happen on every
  start (reading config again, loading from the database) goes in `start`, so
  that a process that starts Ghost again, as tests do, gets it again.
- Nothing imports a shared module. Whoever needs its instance is handed it.

The boundary rules `shared-modules-are-given` and
`shared-modules-only-from-bootstrap` check the imports, and
[a test](../test/unit/bootstrap/steps.test.ts) checks that every folder here
has a root and is named once in the list.

## Legacy aliases

Code in `core` that still imports a shared module by its old path gets the
same instance through an alias, such as
[`core/server/services/limits.ts`](../core/server/services/limits.ts). Aliases
are listed in `sharedModuleAliases` in the boundary configuration. An alias
goes when its importers are handed the instance.

## Transition

Anything moved here that does not meet the rules yet goes in
`ghost/shared/transition/<name>/`, so it is unmistakable. Nothing in
`transition/` is automatic: the list names it explicitly.

[`transition/settings`](transition/settings/index.ts) is the first: it hands
[`settings`](settings/index.ts) what settings still takes from legacy Core.
[`settings/dependencies.ts`](settings/dependencies.ts) lists each thing and why
it is not handed over properly yet (the Bookshelf model, the cache instance
built at import, the legacy event emitter, the cache adapter, the calculated
settings, tracing). The legacy
[`settings-service.js`](../core/server/services/settings/settings-service.js)
keeps `init()` for the tests and tools that call it, and runs the same code.
