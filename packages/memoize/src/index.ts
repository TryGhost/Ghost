// Memoisation helpers for pure derivations of immutable inputs.
//
// This is a memo helper, not a cache. Everything that goes through it must be a
// pure function of arguments that never change underneath us: compiled ICU
// messages for a locale, a parsed NQL filter tree, an `Intl` formatter for a
// timezone, a lazily required module. Anything derived from the settings cache,
// the URL map or a database row is mutable state and needs real invalidation,
// which this deliberately does not have.
//
// The point of sharing one helper is that every memo in Ghost then gets the same
// bound, the same kill switch (`configure`) and the same test reset
// (`resetAll`), instead of each call site growing its own unbounded `Map`.
//
// Ghost Core is CommonJS and loads this through `require(esm)`, so this module
// graph must stay free of top-level `await`.

import errors from '@tryghost/errors';
import { LRUCache } from 'lru-cache';

/**
 * A memoised no-argument function. Calling `reset()` drops the stored value so
 * the next call recomputes.
 */
export type Once<T> = (() => T) & { reset(): void };

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

export interface MemoizeConfig {
  /** When false, `once` and `memoize` hand back the compute function unwrapped. */
  enabled: boolean;
}

/** Modest default bound: big enough for per-locale and per-timezone derivations,
 *  small enough that a surprise key explosion cannot eat the heap. */
const DEFAULT_MAX = 500;

let enabled = true;

// The registry holds plain (strong) references on purpose. Memos are created at
// module scope and live for the life of the process, so there is nothing for a
// weak reference to collect; a `WeakRef` registry would only add the risk that
// `resetAll()` silently skips an instance the GC happened to reach first, which
// would make the test reset unreliable in exactly the cases it exists for.
// The registry is bounded by the number of `once`/`memoize` call sites in the
// codebase, not by traffic.
const registry: { reset(): void }[] = [];

function register<T extends { reset(): void }>(instance: T): T {
  registry.push(instance);
  return instance;
}

/**
 * Configure memoisation process-wide. Ghost Core calls this at boot from
 * `optimization.memoize`; nothing else should. Memos created while disabled are
 * plain passthroughs, so this is a boot-time switch rather than a runtime one.
 */
export function configure({ enabled: nextEnabled }: MemoizeConfig): void {
  enabled = nextEnabled;
}

/** Clear every memo created so far. Ghost's test config helper calls this. */
export function resetAll(): void {
  for (const instance of registry) {
    instance.reset();
  }
}

/**
 * Compute a value once, then return the same value forever.
 *
 * The lazy-require case is `once(() => require('cheerio'))` in CommonJS, or
 * `once(() => createRequire(import.meta.url)('cheerio'))` in ESM.
 *
 * A throwing `compute` is not memoised: the next call retries.
 */
export function once<T>(compute: () => T): Once<T> {
  if (!enabled) {
    const passthrough = (() => compute()) as Once<T>;
    passthrough.reset = () => {};
    return passthrough;
  }

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

  return register(memoized);
}

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

  if (!enabled) {
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
