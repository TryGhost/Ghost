---
name: eslint-config
description: Ghost's ESLint config architecture — the shared config packages, their factories, and the rules for wiring a workspace up. Use when creating or editing an `eslint.config.js`, adding a new workspace, or changing lint rules.
---

# ESLint Config

Source of truth: two internal config packages — [`@internal/cfg-eslint`](../../../configs/eslint/index.mjs) (shared rule atoms + the `nodeLibConfig` factory for Node libs) and [`@internal/cfg-eslint-react`](../../../configs/eslint-react/index.mjs) (the `reactAppConfig` factory for every `apps/*` workspace). Both factories are synchronous and have full JSDoc with `@example`s; hover the call site in your editor. Consume them by name — declare the package as a `workspace:*` devDependency.

Minimal example for a new admin React app (`apps/new-feature/eslint.config.js`):

```js
import {reactAppConfig} from '@internal/cfg-eslint-react';
export default reactAppConfig({
    tailwindCssPath: `${import.meta.dirname}/../admin/src/index.css`,
    shadeRestricted: true
});
```

Conventions:
- **Rules are `'error'` or `'off'` — never `'warn'`.** Warnings get ignored and pollute output. Applies to every workspace covered by the factories above + the standalones; `e2e/` has its own setup (see [e2e/CLAUDE.md](../../../e2e/CLAUDE.md)) and currently still uses warn-level Playwright rules — a separate cleanup.
- **Params prefixed `legacy*`** (`legacyTailwindV3ConfigPath`, `legacyJsTsSplit`) are escape hatches for migrations that haven't shipped yet. Intentional and visible — PRs to remove them are scoped.
- **Standalone configs** (`ghost/core`, `apps/ember-admin`, `apps/admin`, `apps/admin-toolbar`) exist because their rule sets genuinely don't fit a factory — read the file directly. They import shared atoms (`correctnessRules`, `nodeLibRules`, `localFilenamesPlugin`, `strictLinterOptions`) from `@internal/cfg-eslint`.
- **Plugin deps**: a workspace must declare every eslint plugin its config resolves. Two cases:
  - *Factory consumers* only import a factory, which supplies its plugins as objects from the config package — so they need just the config package (`@internal/cfg-eslint` / `@internal/cfg-eslint-react`) as a `workspace:*` devDependency, not the individual plugins.
  - *Hand-rolled configs* (the standalones above, plus the inline configs in `koenig/kg-*` and `e2e/`) `import` plugins directly, so each must list those plugins in its own `devDependencies` — most commonly `eslint-plugin-ghost: catalog:`. Don't rely on the root hoisting a plugin for you; there are no eslint plugins left in the root `package.json` (only `eslint` itself and `globals`, which the root config uses).
  - Exception: Tailwind — a workspace that uses it must list `tailwindcss` as its own (dev)Dependency regardless (the settings-based resolver requires it locally), and the legacy v3 apps pin `eslint-plugin-tailwindcss` via `catalog:tailwind3`.
