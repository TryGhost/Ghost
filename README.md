# Ghost Storage Base

Base class for [Ghost](https://ghost.org) storage adapters. Provides the shared helpers (target directory by year/month, filename sanitization, unique-filename generation) that custom storage adapters build on, and declares the interface (`exists`, `save`, `serve`, `delete`, `read`) that Ghost expects every adapter to implement.

Docs: https://ghost.org/docs/config/#creating-a-custom-storage-adapter

## Install

```sh
pnpm add ghost-storage-base
```

## Usage

Extend `StorageBase` and implement the five required methods. The base class supplies `getTargetDir`, `getSanitizedFileName`, `generateUnique`, and `getUniqueFileName` for you.

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

`generateUnique` and `getUniqueFileName` call `this.exists(...)`, so `exists` must return a `Promise<boolean>` for them to work.

## Development

### Testing

- `pnpm test` to run tests
- `pnpm lint` to run linting

### Publish

- `pnpm ship`

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE). Ghost and the Ghost Logo are trademarks of Ghost Foundation Ltd. Please see our [trademark policy](https://ghost.org/trademark/) for info on acceptable usage.
