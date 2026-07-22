# ghost-storage-base

Base class for [Ghost](https://ghost.org) storage adapters.

Concrete adapters extend `StorageBase` and implement the methods listed in
`requiredFns`: `exists`, `save`, `serve`, `delete` and `read`. TypeScript
adapters must also implement the declared `saveRaw(buffer, targetPath)` and
`urlToPath(url)` methods.

Docs: https://ghost.org/docs/config/#creating-a-custom-storage-adapter

The base class supplies these helpers:

- `getTargetDir(baseDir)` returns a `YYYY/MM` path, optionally inside `baseDir`.
- `getSanitizedFileName(fileName)` replaces unsupported filename characters with `-`.
- `getUniqueFileName(file, targetDir)` and `generateUnique(dir, name, ext, i)`
  call `this.exists(...)` until they find a free filename (`exists` must return
  a `Promise<boolean>`).

```js
import {StorageBase} from 'ghost-storage-base';

class MyStorage extends StorageBase {
    exists(filename, targetDir) { /* ... */ }
    save(file, targetDir)       { /* ... */ }
    serve()                     { /* ... */ }
    delete(filename, targetDir) { /* ... */ }
    read(options)               { /* ... */ }
}
```

## Develop

This is a workspace package in the Ghost monorepo. From the repo root:

```bash
pnpm --filter ghost-storage-base build   # compile to build/ with tsc (ESM)
pnpm --filter ghost-storage-base test    # type-check + unit tests
```

In-monorepo consumers resolve this package via the `source` export condition
(raw `src/*.ts`, no build needed in dev/test). Production, and the tarball
published to npm for external adapter authors, use the compiled `build/` output.

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

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE). Ghost and the Ghost Logo are trademarks of Ghost Foundation Ltd. Please see our [trademark policy](https://ghost.org/trademark/) for info on acceptable usage.
