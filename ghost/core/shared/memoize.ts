// Memoization helper for pure derivations of immutable inputs.
//
// This is a memo helper, not a cache. Everything that goes through it must be a
// pure function of arguments that never change underneath us. Anything derived
// from mutable state needs real invalidation, which this deliberately does not
// have.

import * as errors from '@tryghost/errors';
import { LRUCache } from 'lru-cache';

/** A keyed memoized function. `reset()` empties it. */
export type Memoized<A extends unknown[], R> = ((...args: A) => R) & {
  reset(): void;
};

export interface MemoizeOptions {
  /** Maximum number of entries to retain. Must be a positive integer. */
  max: number;
}

/**
 * Memoize `compute` against a string key derived from its arguments, bounded by
 * `max` entries in LRU order.
 *
 * There is deliberately no TTL: entries are pure derivations of immutable
 * inputs, so an entry is never stale, only evicted to stay inside the bound.
 *
 * A throwing `compute` is not memoized: the next call with the same key retries.
 */
export function memoize<A extends unknown[], R>(
  compute: (...args: A) => R,
  key: (...args: A) => string,
  { max }: Readonly<MemoizeOptions>,
): Memoized<A, R> {
  if (!Number.isSafeInteger(max) || max < 1) {
    throw new errors.IncorrectUsageError({
      message: `memoize: max must be a positive integer, got ${String(max)}`,
    });
  }

  // lru-cache cannot store `undefined` (it reads as a miss), so an `undefined`
  // result is recomputed rather than served from the memo.
  const cache = new LRUCache<string, R & {}>({ max });

  const memoized = ((...args: A) => {
    const cacheKey = key(...args);
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const value = compute(...args);
    if (value !== undefined) {
      cache.set(cacheKey, value as R & {});
    }
    return value;
  }) as Memoized<A, R>;

  memoized.reset = () => cache.clear();

  return memoized;
}
