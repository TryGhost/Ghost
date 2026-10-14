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

## Custom rules in Oxlint

`pnpm lint:oxlint` owns the eight `ghost-custom` rules and the three local rules
(filename matching, Admin paths and E2E reset safety). Their standalone
implementations live in `../oxlint/rules/`; they do not load ESLint plugins.
The ESLint equivalents are off. Other rules supplied by `eslint-plugin-ghost`
remain in ESLint.

The root `.oxlintrc.json` preserves the previous workspace scopes, options and
exceptions. API line limits, assertion-method checks and assertion-parameter
checks were already disabled and remain off. All built-in Oxlint categories
are off; enable further rules individually as `error` or `off`.
`--deny-warnings` rejects accidental warnings.

Run `pnpm lint` from the repository root to run both linters. CI does the same
checks. When adding a workspace or changing a source/test scope, update the
Oxlint overrides as well as the workspace's ESLint config. Use `oxlint-disable`
comments for custom-rule exceptions so ESLint does not report unused directives.

Run the rule and scope regression tests with
`pnpm --filter @internal/scripts exec node --test test/oxlint.test.ts`.
