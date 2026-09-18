// The dependency-free half of @tryghost/memoize.
//
// Import from `@tryghost/memoize/once` rather than the package root when you
// only need `once`. The root also exports `memoize`, which statically imports
// `lru-cache`; a consumer of `once` has no use for that, and Ghost Core reaches
// this module from `boot.js` before it has loaded anything else, so keeping
// `lru-cache` off this path keeps it off the boot path. A test in
// test/entry-points.test.ts enforces that this module stays dependency-free.
//
// Ghost Core is CommonJS and loads this through `require(esm)`, so this module
// graph must stay free of top-level `await`.

import { isEnabled, register } from './state.ts';

export { configure, resetAll } from './state.ts';
export type { MemoizeConfig } from './state.ts';

/**
 * A memoised no-argument function. Calling `reset()` drops the stored value so
 * the next call recomputes.
 */
export type Once<T> = (() => T) & { reset(): void };

/**
 * Compute a value once, then return the same value forever.
 *
 * The lazy-require case is `once(() => require('cheerio'))` in CommonJS, or
 * `once(() => createRequire(import.meta.url)('cheerio'))` in ESM.
 *
 * A throwing `compute` is not memoised: the next call retries.
 */
export function once<T>(compute: () => T): Once<T> {
  if (!isEnabled()) {
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
