# Internal package golden path

This document is the source of truth for Node.js libraries created under
`packages/` for use inside the Ghost monorepo. Start from [`_template`](./_template)
and keep the resulting package aligned with these rules throughout its lifetime.

These defaults do not automatically apply to browser applications, test-only
source helpers, or packages that Ghost intentionally publishes for third-party
consumers. Record and justify exceptions in the package README and configuration.

## Package contract

New internal packages are private, TypeScript-only ESM libraries:

- use an `@tryghost/<name>` package name;
- set `"version": "0.0.0"` and `"private": true`;
- set `"type": "module"`;
- keep authored code in `src/**/*.ts` and tests in `test/**/*.ts`;
- compile production code to `build/` with `tsc`;
- publish no independent npm releases.

Making a package public or independently versioned is a product and maintenance
decision, not a packaging convenience. Establish its compatibility, release and
support policy before removing `private` or adding publishing automation.

## Package metadata

Use the template's repository, author and license metadata. Point repository
metadata at the package's actual directory.

Expose each entry point with the `source`, `types` and `default` conditions, in
that order:

```json
{
  "type": "module",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./build/index.d.ts",
      "default": "./build/index.js"
    }
  },
  "main": "build/index.js",
  "types": "build/index.d.ts",
  "files": ["build"]
}
```

Add explicit export entries for additional public modules. Do not expose broad
filesystem patterns unless consumers genuinely need them.

The `source` condition gives Ghost development and tests build-free access to
raw TypeScript. Plain Node.js ignores it and loads compiled ESM from `build/`.
Keep `src/` out of `files` so release components cannot depend on source-only
behavior accidentally.

## Shared configuration

Use the standard configuration packages as `workspace:*` dev dependencies:

- `@internal/cfg-eslint` with `nodeLibConfig()`;
- `@internal/cfg-typescript` with `esm.json`;
- `@internal/cfg-vitest` with `createVitestConfig()`.

Keep package config files minimal. Add overrides only for behavior that differs
from the shared contract, and explain non-obvious exceptions next to the
override.

The source TypeScript config should set `rootDir` to `src`, `outDir` to `build`
and include only production source. Use a separate `test/tsconfig.json` that
extends the source config, sets `noEmit`, and includes both source and tests.

## Scripts

Use the standard script surface so Nx, CI and agents can operate on every
package consistently:

```json
{
  "scripts": {
    "build": "tsc",
    "test:unit": "NODE_ENV=testing vitest run --coverage",
    "test:types": "tsc --noEmit -p test/tsconfig.json",
    "test": "pnpm run '/^test:/'",
    "lint:code": "eslint src/ --cache",
    "lint:test": "eslint test/ --cache",
    "lint": "pnpm run '/^lint:/'"
  },
  "nx": {
    "targets": {
      "build": {
        "outputs": ["{projectRoot}/build"]
      }
    }
  }
}
```

Add a `dev` watcher only when it is useful. Do not add aliases around these
commands without a concrete need.

## Dependencies

- Use `workspace:*` for dependencies on another Ghost workspace package.
- Use `catalog:` for external dependencies managed by the root catalog.
- Declare every dependency the package imports; do not rely on root hoisting.
- Keep build, lint, test and type tooling in `devDependencies`.
- Keep runtime imports in `dependencies`.

## TypeScript and ESM

The shared TypeScript config uses NodeNext semantics. Relative imports in
TypeScript source must include their real `.ts` extension; the compiler rewrites
it to `.js` on emit.

Ghost Core is CommonJS but runs on Node versions that support `require(esm)`.
Internal ESM packages may therefore serve both `import` and `require()` consumers
from one build. This requires the entire imported module graph to avoid top-level
`await`; ESLint enforces that restriction.

Do not add a CommonJS build or forwarding shim by default. Add multiple formats
only when a verified consumer cannot use the standard ESM output.

## Runtime assets

Production behavior must work from `build/` alone. Import JSON or other assets
from TypeScript when the compiler can copy them. Otherwise add an explicit,
portable build step and include the emitted asset path in package exports or
`files` as required.

Never rely on files that are present in the repository but absent from the
packed package or Ghost release component.

## Verification

For package changes, run at least:

```bash
pnpm --filter @tryghost/<name> build
pnpm --filter @tryghost/<name> test
pnpm --filter @tryghost/<name> lint
```

Also verify:

- representative consumers through the same import or `require()` path they use
  in production;
- both raw `source` resolution and compiled output when a consumer uses both;
- the packed package or Ghost archive when runtime assets or exports change;
- `pnpm build` when build graph or packaging behavior changes.

## Existing packages and exceptions

The golden path is the default for new and modernized internal libraries. Some
existing packages have intentional public-release, browser, dual-format or
test-only contracts. Do not mechanically rewrite them to match the template.

When touching a divergent package, determine whether the difference is required
by a current consumer. Remove accidental drift in a focused change; document and
test necessary exceptions.
