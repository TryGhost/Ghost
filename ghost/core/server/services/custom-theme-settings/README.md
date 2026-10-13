# Custom theme settings

This service owns custom theme setting validation, persistence and activation.
Its wrapper, implementation and model repository live together here. The value
cache remains in `core/shared/custom-theme-settings-cache/`, shared with the
renderer.

Boot calls `init()` before theme startup. The exported wrapper keeps its existing
`api` property; each `init()` replaces that implementation. Theme activation is
an awaited operation performed at boot and after theme changes, separate from
constructing the implementation. This directory move preserves those behaviours.

From `ghost/`, run the implementation and shared-cache tests:

```sh
pnpm exec vitest run \
  test/unit/server/services/custom-theme-settings/service.test.js \
  test/unit/shared/custom-theme-settings-cache/cache.test.ts
```
