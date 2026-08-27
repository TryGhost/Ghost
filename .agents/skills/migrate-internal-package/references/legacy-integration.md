# Integrate a legacy JavaScript package

Read this reference when the imported package is JavaScript or CommonJS. The
import PR establishes ownership and a green workspace package; it does not
modernize the implementation.

## Keep the integration narrow

Change only what Ghost needs to consume and verify the package:

- set `"private": true` and the internal placeholder version;
- set `ghostPackage.goldenPath` to `migration` and describe the remaining
  modernization work in `ghostPackage.reason`;
- point repository metadata at Ghost;
- remove public publishing configuration;
- switch Ghost consumers to `workspace:*`;
- translate source-workspace dependencies deliberately;
- adapt lint and test configuration to Ghost's shared tools.

Do not rename source files, change module format, introduce TypeScript, redesign
exports or clean up implementation details. Use the
`convert-internal-package-to-typescript` skill for that later work.

## ESLint configuration

Use the shared Node library factory in CommonJS mode and declare
`@internal/cfg-eslint` plus `eslint` as package dev dependencies:

```js
import {nodeLibConfig} from '@internal/cfg-eslint';

export default nodeLibConfig({
    typescript: false,
    commonjs: true,
    legacyLocalFilenames: true,
    srcGlobs: ['index.js', 'lib/**/*.js'],
    testGlobs: ['test/**/*.js']
});
```

Prefer fixing trivial configuration drift. When a Ghost rule conflicts with a
test that intentionally exercises legacy behavior, use a narrow, documented
`extraTestRules` exception instead of changing runtime semantics. Rules must be
`'error'` or `'off'`, never warnings.

## Vitest configuration

The shared default targets TypeScript, so override its globs for JavaScript.
Preserve the source repository's coverage thresholds where practical:

```ts
import {createVitestConfig} from '@internal/cfg-vitest';

export default createVitestConfig({
    test: {
        globals: true,
        include: ['test/**/*.test.js'],
        coverage: {
            include: ['lib/**/*.js'],
            thresholds: {
                lines: 90,
                functions: 90,
                branches: 80,
                statements: 90
            }
        }
    }
});
```

Declare `@internal/cfg-vitest`, `@vitest/coverage-v8` and `vitest` in the
package's dev dependencies. Match the actual source and test layout rather than
copying these example globs blindly.

## Dependency mapping

Source `workspace:*` ranges cannot be copied blindly when their packages are
not also Ghost workspaces. For each dependency:

1. Prefer `workspace:*` for an existing Ghost package.
2. Prefer Ghost's catalog when it provides a compatible version.
3. Add the source release's exact published version to a named migration
   catalog when changing the shared catalog would affect unrelated consumers or
   alter behavior. Reference it with `catalog:<name>`; never inline the version.
4. Stop if no published or destination-workspace dependency can satisfy it.

Record temporary named-catalog entries in the PR and reassess them during
modernization.

## Verification

Run the package through its Nx surface and exercise a real consumer:

```bash
pnpm nx run @tryghost/<package>:lint
pnpm nx run @tryghost/<package>:test
pnpm build
```

Also verify:

- the package resolves through the consumer's production `require()` or import;
- relevant consumer tests pass;
- `pnpm archive` succeeds from `ghost/core`;
- the resulting Ghost archive contains the package component.

Generated archives are verification artifacts, not files to commit.
