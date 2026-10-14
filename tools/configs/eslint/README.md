# Shared ESLint configuration

Ghost's shared ESLint rules live in two internal packages:

- `@internal/cfg-eslint` provides shared rule atoms and `nodeLibConfig()` for
  Node.js libraries.
- `@internal/cfg-eslint-react` provides `reactAppConfig()` for React apps under
  `apps/`.

Both factories are synchronous and document their options with JSDoc and
examples in their `index.mjs` files. Add the relevant package as a
`workspace:*` development dependency and consume the factory by name.

```js
import {reactAppConfig} from '@internal/cfg-eslint-react';

export default reactAppConfig({
    tailwindCssPath: `${import.meta.dirname}/../admin/src/index.css`,
    shadeRestricted: true
});
```

## Rules and exceptions

Factory consumers use `error` or `off`, not `warn`. Parameters prefixed with
`legacy`, including `legacyTailwindV3ConfigPath` and `legacyJsTsSplit`, mark
temporary migration exceptions rather than defaults for new work.

Ghost Core keeps a standalone configuration because its rule set does not fit
a shared factory. Read that file directly. It can still import shared atoms such as `correctnessRules`, `nodeLibRules`,
`localFilenamesPlugin`, and `strictLinterOptions` from `@internal/cfg-eslint`.

## Plugin dependencies

A workspace must declare every ESLint plugin that its configuration resolves.

- A factory consumer only needs the config package because the factory supplies
  its plugins as objects.
- A hand-written config that imports a plugin directly must declare that plugin
  in its own `devDependencies`. Do not rely on root dependency hoisting.
- A workspace using Tailwind must declare `tailwindcss` locally. Legacy
  Tailwind v3 apps also use the `tailwind3` catalog entry for
  `eslint-plugin-tailwindcss`.

Run the workspace's `pnpm lint` target after changing its config. Run the root
lint when changing shared rule atoms or either factory.

## Incremental Oxlint adoption

`pnpm lint:oxlint` runs alongside ESLint in `pnpm lint` and CI. All built-in
Oxlint categories are off. The first enabled rule is
`ghost/ghost-custom/no-native-error`, scoped to `ghost/core/server/**/*.{js,ts}`.
The plugin in `../oxlint/plugin.mjs` reuses the installed ESLint rule unchanged
and preserves its name so existing inline ESLint exceptions also apply.

ESLint continues to enforce all existing rules and scopes. Enable further
Oxlint rules individually, using only `error` or `off`, and verify parity before
removing their ESLint equivalents. `--deny-warnings` rejects accidental warnings.

Run the configuration and compatibility tests with
`pnpm --filter @internal/scripts exec node --test test/oxlint.test.ts`.
