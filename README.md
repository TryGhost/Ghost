# Ghost Storage Base

`ghost-storage-base` is the base class for [Ghost](https://ghost.org) storage adapters. It provides the shared helpers that custom adapters build on, and declares the interface that Ghost expects every adapter to implement.

Docs: https://ghost.org/docs/config/#creating-a-custom-storage-adapter

## Install

Requires Node `^22.13.1 || ^24.0.0`.

```sh
pnpm add ghost-storage-base
```

## Usage

The package is published as CommonJS. Extend `StorageBase` and implement the five runtime methods Ghost requires:

```js
const StorageBase = require('ghost-storage-base');

class MyStorage extends StorageBase {
    exists(filename, targetDir) { /* ... */ }
    save(file, targetDir)       { /* ... */ }
    serve()                     { /* ... */ }
    delete(filename, targetDir) { /* ... */ }
    read(options)               { /* ... */ }
}

module.exports = MyStorage;
```

The base class supplies these helpers:

- `getTargetDir(baseDir)` returns a `YYYY/MM` path, optionally inside `baseDir`.
- `getSanitizedFileName(fileName)` replaces unsupported filename characters with `-`.
- `getUniqueFileName(file, targetDir)` and `generateUnique(dir, name, ext, i)` call `this.exists(...)` until they find a free filename.

`exists` must return a `Promise<boolean>` for the unique-filename helpers to work. TypeScript consumers extending the class must also implement the declared `saveRaw(buffer, targetPath)` and `urlToPath(url)` methods.

## Development

Use the package manager version from `package.json`:

```sh
corepack enable
pnpm install
```

Common commands:

- `pnpm test` runs the Vitest suite with coverage.
- `pnpm lint` runs oxlint.
- `pnpm build` compiles `src/` to CommonJS in `dist/`.

### Publish

`pnpm ship` runs the test suite, publishes the package, and pushes tags. It only publishes from a clean working tree. The `prepare` script builds `dist/` for npm publishes, package tarballs, and consumers installing from a git ref.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE). Ghost and the Ghost Logo are trademarks of Ghost Foundation Ltd. Please see our [trademark policy](https://ghost.org/trademark/) for info on acceptable usage.
