# ghost-storage-base

Base class for [Ghost](https://ghost.org) storage adapters. A storage adapter
decides where uploaded images, media, and files are stored and how they're
served — the local filesystem, S3, Google Cloud Storage, etc.

See the [Ghost adapters documentation](https://docs.ghost.org/config#adapters)
for how adapters are configured and loaded.

## Usage

Install the base class alongside your adapter:

```bash
npm install ghost-storage-base
```

Extend `StorageBase` and implement every method listed in `requiredFns`:
`exists`, `save`, `serve`, `delete`, and `read`. TypeScript adapters must also
implement the declared `saveRaw(buffer, targetPath)` and `urlToPath(url)`
methods.

```js
const {StorageBase} = require('ghost-storage-base');

class MyStorage extends StorageBase {
    // Resolve to true if a file already exists at targetDir/fileName.
    exists(fileName, targetDir) { /* ... */ }
    // Persist `file` and resolve to the public URL/path it's served at.
    save(file, targetDir) { /* ... */ }
    // Return an Express middleware that serves stored files.
    serve() { /* ... */ }
    // Remove a stored file.
    delete(fileName, targetDir) { /* ... */ }
    // Resolve to a Buffer of the file at options.path.
    read(options) { /* ... */ }
}

module.exports = MyStorage;
```

The base class supplies these helpers:

- `getTargetDir(baseDir)` returns a `YYYY/MM` path, optionally inside `baseDir`.
- `getSanitizedFileName(fileName)` replaces unsupported filename characters with `-`.
- `getUniqueFileName(file, targetDir)` and `generateUnique(dir, name, ext, i)`
  call `this.exists(...)` until they find a free filename (`exists` must return
  a `Promise<boolean>`).

### Installing and activating

Place the adapter at `content/adapters/storage/MyStorage/index.js` and activate
it in your Ghost config. Storage has three separate feature keys — `active`
(images), `media`, and `files` — and the block named after the adapter is
passed to its constructor:

```json
{
    "storage": {
        "active": "MyStorage",
        "MyStorage": {}
    }
}
```

## Develop

This is a workspace package in the Ghost monorepo. From the repo root:

```bash
pnpm --filter ghost-storage-base build   # compile to build/ with tsc (ESM)
pnpm --filter ghost-storage-base test    # type-check + unit tests
```

This package is ESM-only and compiled with `tsc` (`module: nodenext`). Relative
imports in `src/` must carry an explicit extension; write the real `.ts` one —
`import {x} from './x.ts'` — and `tsc` rewrites it to `.js` on emit
(`rewriteRelativeImportExtensions`).

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE). Ghost and the Ghost Logo are trademarks of Ghost Foundation Ltd. Please see our [trademark policy](https://ghost.org/trademark/) for info on acceptable usage.
