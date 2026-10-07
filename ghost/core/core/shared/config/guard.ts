/**
 * A read-only guard for config, for the environments this repo runs itself.
 *
 * Deep-freezing config makes it immutable but not loud: Ghost's `.js` files and
 * its CommonJS dependencies are sloppy-mode, where a write to a frozen object is
 * dropped without an error. `node --use-strict` does not help - it makes only the
 * entry point strict, and a `require()`d CommonJS module keeps its own
 * strictness. A proxy trap throws whatever the caller's mode, so development and
 * CI fail on a write that production would merely lose.
 *
 * Production keeps the frozen object: it is the cheaper read, and the guard's
 * value is in finding writes before they ship. The two are mutually exclusive -
 * a proxy over a deep-frozen target cannot return a wrapped child, because the
 * invariant for non-writable, non-configurable properties forbids handing back
 * anything other than the target's own value - so a guarded tree is left
 * unfrozen and relies on the traps instead.
 */

const wrappers = new WeakMap<object, unknown>();

/**
 * Whether writes to config should throw rather than be dropped.
 *
 * Matches the environments ./validated.ts validates strictly, for the same
 * reason: a mistake should fail a developer's boot or CI, not a live site.
 * `GHOST_CONFIG_GUARD` overrides in either direction.
 */
export function shouldGuard(env: string): boolean {
  const override = process.env.GHOST_CONFIG_GUARD;

  if (override !== undefined) {
    return override === 'true';
  }

  return env === 'development' || env.startsWith('test');
}

function isWrappable(value: unknown): value is object {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  // leave class instances and anything else exotic alone - config is plain data,
  // and wrapping something with its own internal slots breaks it
  const proto = Object.getPrototypeOf(value);

  return Array.isArray(value) || proto === Object.prototype || proto === null;
}

/**
 * Wrap a config tree so that any write throws, naming the key path.
 *
 * Children are wrapped lazily from the get trap, so only the parts actually read
 * pay for it, and memoised per underlying object, which keeps `===` stable
 * between reads of the same subtree and terminates on cycles.
 */
export function guardReadOnly<T>(tree: T, path = ''): T {
  if (!isWrappable(tree)) {
    return tree;
  }

  const existing = wrappers.get(tree);

  if (existing !== undefined) {
    return existing as T;
  }

  const refuse = (prop: string | symbol): never => {
    // A native TypeError on purpose: it is what a strict-mode write to a frozen
    // object throws, so guarded and frozen config fail the same way. Config also
    // must not depend on @tryghost/error.
    // eslint-disable-next-line ghost/ghost-custom/ghost-error-usage
    throw new TypeError(
      `Ghost config is read-only: attempted write to \`${path ? `${path}:` : ''}${String(prop)}\`. ` +
        'Build a derived object instead - see core/shared/config/SCHEMA.md.',
    );
  };

  const proxy = new Proxy(tree, {
    get(target, prop) {
      const value = Reflect.get(target, prop);

      // symbols carry iterators and inspection hooks, and functions are array
      // and object methods - wrapping either breaks them
      if (typeof prop === 'symbol' || typeof value === 'function') {
        return value;
      }

      return guardReadOnly(value, path ? `${path}:${String(prop)}` : String(prop));
    },
    // without this, Object.getOwnPropertyDescriptor(guarded, k).value hands back
    // the raw child and a write through it misses every trap. Safe to wrap:
    // a guarded tree is left unfrozen, so its properties stay configurable and
    // returning a different value does not break a proxy invariant.
    getOwnPropertyDescriptor(target, prop) {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);

      if (!descriptor || !('value' in descriptor) || typeof prop === 'symbol') {
        return descriptor;
      }

      return {
        ...descriptor,
        value: guardReadOnly(descriptor.value, path ? `${path}:${String(prop)}` : String(prop)),
      };
    },
    set(_target, prop) {
      return refuse(prop);
    },
    defineProperty(_target, prop) {
      return refuse(prop);
    },
    deleteProperty(_target, prop) {
      return refuse(prop);
    },
    setPrototypeOf() {
      return refuse('[[Prototype]]');
    },
  });

  wrappers.set(tree, proxy);

  return proxy as T;
}
