# Ghost Core services

Services under this directory own domain and integration logic used by Ghost
Core. Follow an existing service in the same area when extending established
code. New standalone service logic should be TypeScript unless it must extend an
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
