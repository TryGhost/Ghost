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

Ghost Core, Ember Admin, and Admin Toolbar keep standalone configurations
because their rule sets do not fit a shared factory. Read those files directly.
They can still import shared atoms such as `correctnessRules`, `nodeLibRules`,
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
