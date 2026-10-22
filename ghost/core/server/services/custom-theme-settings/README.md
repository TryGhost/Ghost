# Custom theme settings

This service owns custom theme setting validation, persistence and activation.
Its initializer, implementation and model repository live together here. The value
cache remains in `core/shared/custom-theme-settings-cache/`, shared with the
renderer.

Boot awaits `init()` before theme startup. The TypeScript root default-exports
the initializer, which retains one implementation on `.service`. The root supplies
the model, shared cache and configured debug logger. Theme activation remains an
awaited operation performed at every boot and after theme changes, separate from
constructing the implementation.

From the repository root, run the root, implementation and shared-cache tests:

```sh
pnpm nx run ghost:test:unit \
  test/unit/server/services/custom-theme-settings/index.test.ts \
  test/unit/server/services/custom-theme-settings/service.test.js \
  test/unit/shared/custom-theme-settings-cache/cache.test.ts
```
