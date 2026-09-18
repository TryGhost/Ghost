import type { Provider } from 'nconf';

/**
 * The methods that mutate the config chain, either by writing a value or by
 * changing which stores are in it.
 *
 * These throw once frozen rather than becoming no-ops. nconf has its own
 * `readOnly` flag on each store, but `Provider._execute` *skips* read-only
 * stores for a destructive action and returns `undefined`, so flipping that
 * flag would silently swallow config writes instead of surfacing them.
 *
 * `required()` is deliberately absent: despite sitting alongside these on the
 * provider, it only calls `get()` for each key and throws when one is missing,
 * so it stays usable on a frozen config.
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
] as const;

/**
 * How a value handed back by `get()` is protected.
 *
 * - `freeze` deep-freezes it. Zero cost to read, but a write only throws in
 *   strict-mode code. A plain CommonJS module body or a non-class function
 *   silently no-ops instead, so the config quietly is not applied. Every bug
 *   found auditing this was of that shape.
 * - `proxy` wraps it so the write trap throws explicitly. A trap that throws
 *   propagates regardless of the caller's strictness, so the failure is loud
 *   everywhere. Costs a little on each property read of a config object.
 *
 * Selected with GHOST_CONFIG_GUARD while the two are being compared.
 */
const GUARD_MODE: 'freeze' | 'proxy' =
  process.env.GHOST_CONFIG_GUARD === 'freeze' ? 'freeze' : 'proxy';

/**
 * Recursively freeze a value so that a caller mutating what `get()` handed back
 * fails loudly instead of silently corrupting the cache for everyone.
 *
 * Nested objects are shared by reference with nconf's own stores, so this
 * freezes those too - which is the intent: after `freeze()` nothing should be
 * writing to config through any route.
 */
function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  const obj = value as unknown as object;

  if (seen.has(obj)) {
    return value;
  }

  seen.add(obj);

  for (const nested of Object.values(obj)) {
    deepFreeze(nested, seen);
  }

  return Object.freeze(value);
}

/**
 * Only plain objects and arrays are wrapped. A class instance or anything with
 * an exotic prototype is handed back untouched rather than risking a proxy
 * around something that cares about its own identity or internal slots.
 */
function isPlainContainer(value: unknown): value is object {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value)) {
    return true;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function rejectWrite(operation: string, property: PropertyKey): never {
  // new TypeError is allowed here, as we do not want config to depend on
  // @tryghost/errors, and TypeError is what the engine itself raises for a
  // write to a frozen object in strict mode.
  // eslint-disable-next-line ghost/ghost-custom/ghost-error-usage
  throw new TypeError(
    `Config is read-only: cannot ${operation} '${String(property)}' on a value returned by config.get(). Copy it first if you need to change it - config is read-only once loaded.`,
  );
}

/**
 * Wrap a value so that any attempt to write to it throws.
 *
 * Children are wrapped lazily from the `get` trap rather than up front: that
 * keeps the target object untouched (nconf's stores are shared by reference and
 * must not be rewritten) and means only the parts actually read pay for it.
 * Wrappers are memoised per underlying object, which also handles cycles.
 */
const guardCache = new WeakMap<object, object>();

function deepGuard<T>(value: T): T {
  if (!isPlainContainer(value)) {
    return value;
  }

  const existing = guardCache.get(value);
  if (existing) {
    return existing as T;
  }

  const proxy = new Proxy(value, {
    get(target, property, receiver) {
      return deepGuard(Reflect.get(target, property, receiver));
    },
    set(_target, property) {
      rejectWrite('set', property);
    },
    deleteProperty(_target, property) {
      rejectWrite('delete', property);
    },
    defineProperty(_target, property) {
      rejectWrite('define', property);
    },
    setPrototypeOf() {
      rejectWrite('set the prototype of', '[[Prototype]]');
    },
  });

  guardCache.set(value, proxy);

  return proxy as T;
}

function protect<T>(value: T): T {
  return GUARD_MODE === 'freeze' ? deepFreeze(value) : deepGuard(value);
}

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

    // Protected, so that a caller which mutates the object it was handed gets a
    // loud TypeError rather than quietly rewriting the cache for every
    // subsequent reader
    const value = protect(originalGet(key));
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
