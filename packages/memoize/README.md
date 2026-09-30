# @tryghost/memoize

Bounded memoization helpers for pure derivations of immutable inputs

## What this is for

Memoizing a pure function of inputs that never change: compiled ICU messages
per locale and text, a parsed NQL filter tree, an `Intl` formatter per timezone.
Sharing one helper gives each of those the same bound and the same semantics,
instead of every call site growing its own unbounded `Map`.

## What this is not for

This is a memo helper, not a cache. Anything derived from mutable state, such as
settings or a database row, needs real invalidation, which this deliberately does
not have. There is no TTL for the same reason: an entry is never stale, only
evicted to stay inside the bound.

## Usage

```ts
import { memoize, once } from '@tryghost/memoize';
```

### `memoize(compute, key, options?)`

Memoizes `compute` against a string key derived from its arguments, backed by
`lru-cache`:

```ts
const formatterFor = memoize(
  (timezone: string) => new Intl.DateTimeFormat('en', { timeZone: timezone }),
  (timezone) => timezone,
  { max: 100 },
);
```

The returned function carries `reset()` and a readonly `size`. `options.max`
defaults to 500 and must be a positive integer.

### `once(compute)`

Computes on the first call and returns the same value afterwards. The returned
function carries `reset()`.

```ts
const getCollator = once(() => new Intl.Collator('en', { numeric: true }));
```

### What gets stored

- A `compute` that throws is not memoized: the next call retries.
- `memoize` does not store `undefined`, because `lru-cache` reads it as a miss,
  so an `undefined` result is recomputed.
- A promise is stored like any other value, rejected or not. These helpers are
  meant for synchronous derivations.

## Develop

This is a workspace package in the Ghost monorepo. From the package directory:

```bash
pnpm build   # compile to build/ with tsc (ESM)
pnpm test    # type-check + unit tests
pnpm lint    # lint source and tests
```
