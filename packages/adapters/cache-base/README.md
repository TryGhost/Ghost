# @tryghost/adapter-base-cache

Base class for Ghost cache adapters.

Concrete adapters extend `BaseCacheAdapter` and implement the methods listed in
`requiredFns`: `get`, `set`, `reset` and `keys`.

## Develop

This is a workspace package in the Ghost monorepo. From the repo root:

```bash
pnpm --filter @tryghost/adapter-base-cache test    # unit tests + coverage
pnpm --filter @tryghost/adapter-base-cache lint    # lint code + tests
```

This package is CommonJS with no build step — `ghost/core` consumes it directly
via `require()`. Type definitions are hand-maintained in `index.d.ts`.
