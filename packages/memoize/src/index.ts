// Memoization helpers for pure derivations of immutable inputs.
//
// This is a memo helper, not a cache. Everything that goes through it must be a
// pure function of arguments that never change underneath us. Anything derived
// from mutable state needs real invalidation, which this deliberately does not
// have.

import errors from '@tryghost/errors';
import { LRUCache } from 'lru-cache';

/**
 * A memoized no-argument function. Calling `reset()` drops the stored value so
 * the next call recomputes.
 */
export type Once<T> = (() => T) & { reset(): void };

/**
 * Compute a value once, then return the same value forever.
 *
 * A throwing `compute` is not memoized: the next call retries.
 */
export function once<T>(compute: () => T): Once<T> {
  let computed = false;
  let value: T;

  const memoized = (() => {
    if (!computed) {
      // Assigned before `computed` flips, so a throw leaves the memo empty.
      value = compute();
      computed = true;
    }
    return value;
  }) as Once<T>;

  memoized.reset = () => {
    computed = false;
    value = undefined as T;
  };

  return memoized;
}

/**
 * A keyed memoized function. `reset()` empties it, `size` reports how many
 * entries are currently held.
 */
export type Memoized<A extends unknown[], R> = ((...args: A) => R) & {
  reset(): void;
  readonly size: number;
};

export interface MemoizeOptions {
  /** Maximum number of entries to retain. Must be a positive integer. */
  max?: number;
}

const DEFAULT_MAX = 500;

/**
 * Memoize `compute` against a string key derived from its arguments, bounded by
 * `options.max` entries in LRU order.
 *
 * There is deliberately no TTL: entries are pure derivations of immutable
 * inputs, so an entry is never stale, only evicted to stay inside the bound.
 *
 * A throwing `compute` is not memoized: the next call with the same key retries.
 */
export function memoize<A extends unknown[], R>(
  compute: (...args: A) => R,
  key: (...args: A) => string,
  options: MemoizeOptions = {},
): Memoized<A, R> {
  const max = options.max ?? DEFAULT_MAX;
  if (!Number.isInteger(max) || max < 1) {
    throw new errors.IncorrectUsageError({
      message: `memoize: options.max must be a positive integer, got ${String(max)}`,
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
  Object.defineProperty(memoized, 'size', { get: () => cache.size });

  return memoized;
}
