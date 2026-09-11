# @tryghost/metafield-types

Shared catalog of member metafield types: storage routing and value validation, consumed by Ghost core and admin

## Develop

This is a workspace package in the Ghost monorepo. From the repo root:

```bash
pnpm --filter @tryghost/metafield-types build   # compile to build/ with tsc (ESM)
pnpm --filter @tryghost/metafield-types test    # type-check + unit tests
pnpm --filter @tryghost/metafield-types dev     # rebuild on change
```

In-monorepo consumers resolve this package via the `source` export condition
(raw `src/*.ts`, no build needed in dev/test). Production and any published
tarball use the compiled `build/` output.

This package is ESM-only and compiled with `tsc` (`module: nodenext`). Relative
imports in `src/` must carry an explicit extension; write the real `.ts` one —
`import {x} from './x.ts'` — and `tsc` rewrites it to `.js` on emit
(`rewriteRelativeImportExtensions`).

`./structure` is the half of the catalog a renderer needs — which parts a field type
has, and what each holds — and it stands apart from `./index` so that importing it
costs a bundle almost nothing. The rules in `./index` are built on zod, some
seventeen kilobytes gzipped that a renderer never runs. Portal imports `./structure`
and loads on every page view of every themed site, so the difference reaches every
visitor of every Ghost site.

That holds only while `./structure` depends on nothing, and no bundler enforces it: an
import added here would ship to every one of those visitors with every check still
green. So **`src/structure.ts` must not import anything** — an ESLint rule enforces
it, relative imports included, since anything reached through one is bundled too.
Whatever needs an import belongs in `./index`, which is free to use them.

`ghost/core` is CommonJS but consumes this package via `require()`, which works
on Ghost's Node version (22.13+/24) through Node's `require(esm)` support. That
support has one hard constraint: **no top-level `await`** anywhere in this
package's module graph — it makes the graph async and `require()` of it throws
`ERR_REQUIRE_ASYNC_MODULE`. Keep module-level initialization synchronous. (An
ESLint rule enforces this.)
