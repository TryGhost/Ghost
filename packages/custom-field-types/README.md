# @tryghost/custom-field-types

Shared catalog of member custom field types: storage routing and value validation, consumed by Ghost core and admin

## Develop

This is a workspace package in the Ghost monorepo. From the repo root:

```bash
pnpm --filter @tryghost/custom-field-types build   # compile to build/ with tsc (ESM)
pnpm --filter @tryghost/custom-field-types test    # type-check + unit tests
pnpm --filter @tryghost/custom-field-types dev     # rebuild on change
```

In-monorepo consumers resolve this package via the `source` export condition
(raw `src/*.ts`, no build needed in dev/test). Production and any published
tarball use the compiled `build/` output.

This package is ESM-only and compiled with `tsc` (`module: nodenext`). Relative
imports in `src/` must carry an explicit extension; write the real `.ts` one —
`import {x} from './x.ts'` — and `tsc` rewrites it to `.js` on emit
(`rewriteRelativeImportExtensions`).

`ghost/core` is CommonJS but consumes this package via `require()`, which works
on Ghost's Node version (22.13+/24) through Node's `require(esm)` support. That
support has one hard constraint: **no top-level `await`** anywhere in this
package's module graph — it makes the graph async and `require()` of it throws
`ERR_REQUIRE_ASYNC_MODULE`. Keep module-level initialization synchronous. (An
ESLint rule enforces this.)
