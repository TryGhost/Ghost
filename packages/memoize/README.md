# @tryghost/memoize

Bounded memoization helpers for pure derivations of immutable inputs

This is an internal workspace package. See the
[internal package golden path](../README.md) for its standing architecture and
maintenance rules.

## What this is for

Several places in Ghost memoise a pure derivation of an input that never
changes: compiled ICU messages per locale and text, locale candidate lists,
parsed NQL filter trees, an `Intl` formatter per timezone, the parsed site URL,
lazily required modules on the request path. Each of those otherwise grows its
own `Map`, with its own (usually absent) bound and no shared way to clear it.

Routing them through one helper gives them one bound, one kill switch and one
test reset.

## What this is not for

This is a memo helper, not a cache. Everything that goes through it must be a
pure function of arguments that never change underneath us. Anything derived
from the settings cache, the URL map or a database row is mutable state: it
needs real invalidation, which this deliberately does not have. There is no TTL
for the same reason — an entry is never stale, only evicted to stay inside the
bound.

## Usage

```ts
import { memoize, once } from '@tryghost/memoize';
```

Ghost Core is CommonJS and loads this through `require(esm)`:

```js
const { once } = require('@tryghost/memoize');
```

That works only while the whole imported module graph is free of top-level
`await`. ESLint enforces that here.

### `once(compute)`

Computes on the first call and returns the same value afterwards. This is the
lazy-require shape:

```js
// CommonJS
const loadCheerio = once(() => require('cheerio'));

// ESM
const loadCheerio = once(() => createRequire(import.meta.url)('cheerio'));
```

`once(...)` returns the memoised function with a `reset()` method that drops the
stored value.

### `memoize(compute, key, options?)`

Memoises `compute` against a string key derived from its arguments, backed by
`lru-cache`:

```ts
const formatterFor = memoize(
  (timezone: string) => new Intl.DateTimeFormat('en', { timeZone: timezone }),
  (timezone) => timezone,
  { max: 100 },
);
```

The returned function carries `reset()` and a readonly `size`. `options.max`
defaults to 500 and must be a finite positive integer — an unbounded memo is the
thing this package exists to prevent.

Errors thrown by `compute` are never memoised: the next call with the same key
retries. A `compute` that returns `undefined` is not memoised either, because
`lru-cache` reads a stored `undefined` as a miss.

### `configure({enabled})`

Ghost Core calls this once at boot from the `optimization.memoize` config key
(default `true`); nothing else should read config from inside this package.

When memoisation is disabled, `once` and `memoize` return plain passthroughs
that call `compute` every time and whose `reset()` is a no-op. This is decided
when the memo is created, so it is a boot-time kill switch rather than a runtime
one — Core calls `configure` before it requires anything that builds a memo.

### `resetAll()`

Clears every memo created so far. Ghost's test config helper (`configUtils.restore`)
calls it, so tests that rewrite config or swap modules in the require cache are
not served values derived from the previous state.

The registry behind it holds plain, strong references rather than weak ones.
Memos are created at module scope and live for the life of the process, so there
is nothing for a `WeakRef` to collect; using one would only add the chance that
`resetAll()` silently skips an instance, which would make the test reset
unreliable in exactly the cases it exists for. The registry is bounded by the
number of `once`/`memoize` call sites, not by traffic.

## Develop

This is a workspace package in the Ghost monorepo. From the package directory:

```bash
pnpm build   # compile to build/ with tsc (ESM)
pnpm test    # type-check + unit tests
pnpm lint    # lint source and tests
```
