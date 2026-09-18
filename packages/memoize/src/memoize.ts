// The keyed half of @tryghost/memoize, split from ./once.ts so that a consumer
// of `once` alone does not load `lru-cache` — see the note in ./once.ts.

import errors from '@tryghost/errors';
import { LRUCache } from 'lru-cache';

import { isEnabled, register } from './state.ts';

/**
 * A keyed memoised function. `reset()` empties it, `size` reports how many
 * entries are currently held.
 */
export type Memoized<A extends unknown[], R> = ((...args: A) => R) & {
  reset(): void;
  readonly size: number;
};

export interface MemoizeOptions {
  /** Maximum number of entries to retain. Must be a finite positive integer. */
  max?: number;
}

/** Modest default bound: big enough for per-locale and per-timezone derivations,
 *  small enough that a surprise key explosion cannot eat the heap. */
const DEFAULT_MAX = 500;

/**
 * Memoise `compute` against a string key derived from its arguments, bounded by
 * `options.max` entries in LRU order.
 *
 * There is deliberately no TTL: entries are pure derivations of immutable
 * inputs, so an entry is never stale, only evicted to stay inside the bound.
 *
 * A throwing `compute` is not memoised: the next call with the same key retries.
 */
export function memoize<A extends unknown[], R>(
  compute: (...args: A) => R,
  key: (...args: A) => string,
  options: MemoizeOptions = {},
): Memoized<A, R> {
  // A finite bound is the whole point of routing memos through here, so an
  // unbounded or nonsensical `max` is a programmer error. Checked before the
  // `enabled` branch so the kill switch cannot hide it.
  const max = options.max ?? DEFAULT_MAX;
  if (!Number.isInteger(max) || max < 1) {
    throw new errors.IncorrectUsageError({
      message: `memoize: options.max must be a positive integer, got ${String(max)}`,
    });
  }

  if (!isEnabled()) {
    const passthrough = ((...args: A) => compute(...args)) as Memoized<A, R>;
    passthrough.reset = () => {};
    Object.defineProperty(passthrough, 'size', { get: () => 0 });
    return passthrough;
  }

  // `R` is widened to `{}` for the cache's value type: lru-cache cannot store
  // `undefined` (it reads as a miss), so an `undefined` result is recomputed
  // rather than served from the memo. That is a correctness-preserving
  // pessimisation, not a behaviour change.
  const cache = new LRUCache<string, R & {}>({ max });

  const memoized = ((...args: A) => {
    const cacheKey = key(...args);
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Left uncached if `compute` throws, so the next call retries.
    const value = compute(...args);
    if (value !== undefined) {
      cache.set(cacheKey, value as R & {});
    }
    return value;
  }) as Memoized<A, R>;

  memoized.reset = () => cache.clear();
  Object.defineProperty(memoized, 'size', { get: () => cache.size });

  return register(memoized);
}
