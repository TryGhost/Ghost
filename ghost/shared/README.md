# Shared modules

A shared module is a module that more than one service, or the web layer, uses.
It lives here, outside `ghost/core`, because `ghost/core` is legacy code.

A shared module is described the same way a service is: its `index.ts`
default-exports `defineService(name, { create })`, imported from
`../../bootstrap/transition/define-service`. The application builds it the first
time something uses it and forgets it when it stops. See the
[services guide](../core/server/services/README.md) for `defineService`.

## Rules

- Read the instance when you use it: `limits.service.isLimited('staff')`. Do not
  keep it in a module-level variable; the instance is new after a restart.
- A shared module does not import a service, the API or the web layer. They
  depend on it, not the other way round. `pnpm lint:boundaries` checks this.
- `create` is synchronous and builds from the `foundation` it is handed (config,
  logger, database, events, clock).

## Modules

- [`limits/`](limits/index.ts): the limits a host puts on the site.
