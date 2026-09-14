import type { Provider } from 'nconf';

/**
 * The methods that mutate the config chain, either by writing a value or by
 * changing which stores are in it.
 *
 * These throw once frozen rather than becoming no-ops. nconf has its own
 * `readOnly` flag on each store, but `Provider._execute` *skips* read-only
 * stores for a destructive action and returns `undefined`, so flipping that
 * flag would silently swallow config writes instead of surfacing them.
 */
const MUTATORS = [
  'set',
  'clear',
  'merge',
  'reset',
  'load',
  'add',
  'remove',
  'file',
  'use',
  'required',
] as const;

/**
 * The freeze API added to the config instance.
 */
export interface ConfigFreeze {
  /**
   * Make the config read-only and start caching lookups by key.
   */
  freeze(): void;
  /**
   * Undo `freeze()` and drop the cache. Only needed by tests - Ghost itself
   * never thaws a frozen config.
   */
  unfreeze(): void;
  isFrozen(): boolean;
}

/**
 * Add the freeze API to a config instance.
 *
 * Once frozen, `get` is memoised by key. Because every cached value is whatever
 * nconf itself returned for that key, a frozen lookup can never disagree with an
 * unfrozen one - and with writes rejected, a cache entry can never go stale, so
 * there is no invalidation to get wrong.
 *
 * A keyless `get()` (the whole merged tree) is left uncached: nothing in Ghost
 * calls it outside of debug output and tests, and it would pull the entire
 * environment - nconf's env store included - into a long-lived object.
 */
export function bindFreeze(nconf: Provider): asserts nconf is Provider & ConfigFreeze {
  const target = nconf as Provider & ConfigFreeze;
  const cache = new Map<string, unknown>();
  const originalGet = nconf.get.bind(nconf);
  let frozen = false;

  target.get = function get(key?: string, callback?: unknown) {
    // Callback-style and whole-tree reads always go to nconf
    if (!frozen || key === undefined || typeof callback === 'function') {
      return originalGet(key as string, callback as never);
    }

    // `has`, not a truthy check - an absent key caches as `undefined` too,
    // otherwise every miss pays full price on every lookup
    if (cache.has(key)) {
      return cache.get(key);
    }

    const value = originalGet(key);
    cache.set(key, value);

    return value;
  } as Provider['get'];

  for (const method of MUTATORS) {
    const original = (nconf[method] as (...args: unknown[]) => unknown).bind(nconf);

    (target[method] as unknown) = function (...args: unknown[]) {
      if (frozen) {
        // new Error is allowed here, as we do not want config to depend on @tryghost/error
        // eslint-disable-next-line ghost/ghost-custom/no-native-error
        throw new Error(
          `Config is frozen and cannot be changed: ${method}(${typeof args[0] === 'string' ? `'${args[0]}'` : ''}) was called after config was loaded. Config is read-only once loaded - move this value into a service if it needs to change at runtime.`,
        );
      }

      return original(...args);
    };
  }

  target.freeze = function freeze(): void {
    cache.clear();
    frozen = true;
  };

  target.unfreeze = function unfreeze(): void {
    frozen = false;
    cache.clear();
  };

  target.isFrozen = function isFrozen(): boolean {
    return frozen;
  };
}
