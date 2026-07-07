# The DI container

Ghost builds its service graph through this container: a root holds
registrations and process-wide singletons, a scope holds one site's instances.
Boot creates one default scope; tests create as many as they need. The full
design and its rationale live in the DI migration plan (docs repo); this file
is the working contract.

## Rules for new code

1. **Factories take a single destructured object of named dependencies**
   (`({models, settingsCache}) => instance`) and are registered in
   `core/registrations.ts`. Registration names are API — they must match the
   names factories destructure. This shape is Awilix PROXY-mode compatible.
2. **Never read the config, settings-cache, or event singletons from a factory
   or from container code** — take them from the cradle. Lint enforces this.
3. **`SCOPED` unless it is genuinely deployment-level** (logging, metrics,
   adapter *classes*). A wrongly-singleton stateful object is a cross-site
   leak; the resolver throws on singleton→scoped resolution (captive check).
4. **Legacy modules become facades** (`createFacade(name, legacyThunk)`), for
   existing call sites only. New code takes cradle deps. The DI burn-down
   ratchet (`pnpm lint:di-burndown`) fails CI if require-time singletons or
   direct choke-point requires increase.
5. **Config values come in as seeds** (built in `core/boot-seeds.js`): live
   getters for values tests mutate at runtime (hostSettings), thunks for
   init-time reads, plain values otherwise.
6. **Register a disposer** for anything holding external resources
   (connections, listeners, timers).

## Testing

- `test/unit/shared/container/two-scope.test.ts` is the definition of done:
  every registration is constructed on two scopes and must be isolated. It
  derives the list from the container, so new registrations are covered
  automatically — if yours needs extra seeds to construct, add them to the
  test's `createSiteScope`.
- Stub through the same access path the code under test uses (the module
  facade, e.g. `models.ApiKey`), never a class captured from a submodule.
- Stubs installed before Ghost boots need
  `test/utils/container-utils.js#ensureDefaultScope()` first, so they land on
  the instance boot will reuse.

## Traps that have bitten before

- Load-time captures of facade methods (`const get = settingsCache.get`) bind
  the unbooted fallback instance. Capture after boot, or use
  `stub.wrappedMethod`.
- Module loaders probe exports (`__esModule`, `default`, `then`,
  `module.exports`) at require time; `create-facade` answers these without
  constructing — keep it that way.
- Wrapper objects that tests reset (`service.api = null; service.init()`) need
  plain assignable fields, not getters.
