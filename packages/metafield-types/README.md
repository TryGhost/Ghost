# @tryghost/metafield-types

The types of member custom field Ghost supports: which types exist, what each type
is composed of, and how a value of each type is validated. Ghost, its Admin and Portal
use it, and so can an integration that offers inputs for a site's custom fields, such
as the Ghost Zapier integration.

```bash
npm install @tryghost/metafield-types
```

## Entry points

- `@tryghost/metafield-types/structure`: the type ids and what each type is composed
  of. A type is one leaf, or a record of named leaves, and a leaf is text of a size or a
  choice from a list, such as a country. It depends on nothing.
- `@tryghost/metafield-types/countries`: the two-letter country codes the list of
  countries offers. It depends on nothing.
- `@tryghost/metafield-types/identity`: how a field is named everywhere: its
  namespace, its key, the parts of a record value, and the identity they make
  together (`custom.shipping_address.country`). Each is a type that only its
  check produces. It loads `zod/mini`, a small fraction of zod's size, so a
  browser app can check identities without paying for the rest.
- `@tryghost/metafield-types`: the structure above, plus `valueSchemaFor(field)`,
  the rule a value of a field must satisfy. The rules are built on
  [zod](https://zod.dev), and only this entry point loads all of it, so an
  integration that only draws inputs can use `./structure` and `./countries`
  without loading zod at all.

## Compatibility

An integration using this package talks to sites on many Ghost versions, so a type
never changes once it has shipped. It keeps what it is composed of: its shape, its
leaves, and the names of any parts. New structure arrives as a new type. An integration
should skip a type it doesn't recognise, which is what happens when a site is on a newer
Ghost than the package the integration was built with.

## Develop

This is a workspace package in the Ghost monorepo. Adding a field type to Ghost is
covered in [`docs/adding-a-field-type.md`](docs/adding-a-field-type.md). From the repo
root:

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

`./structure` is the half of the catalog a renderer needs, what each field type is
composed of, and it stands apart from `./index` so that importing it costs a bundle
almost nothing. The rules in `./index` are built on zod, some
seventeen kilobytes gzipped that a renderer never runs. Portal imports `./structure`
and loads on every page view of every themed site, so the difference reaches every
visitor of every Ghost site.

That holds only while `./structure` depends on nothing, and no bundler enforces it: an
import added here would ship to every one of those visitors with every check still
green. So **`src/structure.ts` must not import anything** — an ESLint rule enforces
it, relative imports included, since anything reached through one is bundled too.
Whatever needs an import belongs in `./index`, which is free to use them.

`ghost` is CommonJS but consumes this package via `require()`, which works
on Ghost's Node version (22.13+/24) through Node's `require(esm)` support. That
support has one hard constraint: **no top-level `await`** anywhere in this
package's module graph — it makes the graph async and `require()` of it throws
`ERR_REQUIRE_ASYNC_MODULE`. Keep module-level initialization synchronous. (An
ESLint rule enforces this.)
