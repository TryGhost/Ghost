# @tryghost/adapter-base-cache

Base class for Ghost cache adapters. A cache adapter backs one of Ghost's
internal caches (settings, image sizes, gscan results, ...) with a store of
your choice — an in-process map, Redis, Memcached, etc.

See the [Ghost adapters documentation](https://docs.ghost.org/config#adapters)
for how adapters are configured and loaded.

## Usage

Install the base class alongside your adapter:

```bash
npm install @tryghost/adapter-base-cache
```

Extend `CacheBase` and implement every method listed in `requiredFns`:
`get`, `set`, `reset`, and `keys`. Each may be synchronous or return a
`Promise`.

```js
const {CacheBase} = require('@tryghost/adapter-base-cache');

class MyCache extends CacheBase {
    constructor(config) {
        super();
        // `config` is the settings block from your Ghost config (see below)
        this.store = new Map();
    }

    get(key) {
        return this.store.get(key);
    }

    set(key, value) {
        this.store.set(key, value);
    }

    reset() {
        this.store.clear();
    }

    // Deprecated — may be removed in a future version. Returns all cache keys.
    keys() {
        return [...this.store.keys()];
    }
}

module.exports = MyCache;
```

### Installing and activating

Place the adapter at `content/adapters/cache/MyCache/index.js` and activate it
in your Ghost config. `active` names the adapter; the matching block is passed
to its constructor:

```json
{
    "adapters": {
        "cache": {
            "active": "MyCache",
            "MyCache": {}
        }
    }
}
```

## Develop

This is a workspace package in the Ghost monorepo. From the repo root:

```bash
pnpm --filter @tryghost/adapter-base-cache build   # compile to build/ with tsc (ESM)
pnpm --filter @tryghost/adapter-base-cache test    # type-check + unit tests
```

This package is ESM-only and compiled with `tsc` (`module: nodenext`). Relative
imports in `src/` must carry an explicit extension; write the real `.ts` one —
`import {x} from './x.ts'` — and `tsc` rewrites it to `.js` on emit
(`rewriteRelativeImportExtensions`).

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE). Ghost and the Ghost Logo are trademarks of Ghost Foundation Ltd. Please see our [trademark policy](https://ghost.org/trademark/) for info on acceptable usage.
