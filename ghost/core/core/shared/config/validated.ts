import type { ReadonlyDeep } from 'type-fest';
import { z } from 'zod';
import { bindAll as bindUrlHelpers, type BoundHelpers } from '@tryghost/config-url-helpers';
import { bindAll as bindHelpers, type ConfigHelpers } from './helpers';
import { configSchema, type ConfigAt, type ConfigPath, type ValidatedConfig } from './schema';

/**
 * Recursively freeze a plain-data tree in place. Only safe on a structure
 * nothing else holds a reference to.
 *
 * Returns the original value and tolerates cycles. Already-frozen objects are
 * skipped, including their children, so their descendants must already be frozen.
 * Recursion only follows own enumerable string-keyed properties.
 */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }

  return value;
}

/**
 * Whether a schema violation is fatal.
 *
 * Only the environments this repo runs itself are strict: a schema mistake here
 * should fail a developer's boot or CI, not a live site's. Ghost(Pro) injects
 * config through environment variables this repo cannot see, and self-hosters
 * and embedders pick their own NODE_ENV (`staging`, whatever else), so anything
 * unrecognised warns rather than turning into a boot crash-loop.
 *
 * `GHOST_CONFIG_SCHEMA_STRICT` overrides in either direction, which is how a
 * production deploy opts in once it trusts the schema. When set, only the exact
 * value `true` enables strict mode; every other value disables it.
 *
 * `startsWith('test')` matches `isTestEnv()` in ./helpers.ts, covering `testing`
 * and `testing-mysql`.
 */
function isStrict(env: string): boolean {
  const override = process.env.GHOST_CONFIG_SCHEMA_STRICT;

  if (override !== undefined) {
    return override === 'true';
  }

  return env === 'development' || env.startsWith('test');
}

/**
 * Validate a config tree and deep-freeze it.
 *
 * Returns the frozen parsed result on success. Schema violations throw an Error
 * in strict mode (see isStrict); otherwise the original tree is returned frozen,
 * even though it does not satisfy the schema.
 *
 * The caller must hand over an unshared tree: unknown keys pass through by
 * reference and are frozen, and the fallback freezes the input tree itself.
 */
export function validateConfig(tree: Record<string, unknown>): ValidatedConfig {
  const result = configSchema.safeParse(tree);

  if (result.success) {
    return deepFreeze(result.data);
  }

  const report = z.prettifyError(result.error);

  if (isStrict(String(tree.env))) {
    // new Error is allowed here, as we do not want config to depend on @tryghost/error
    // eslint-disable-next-line ghost/ghost-custom/no-native-error
    throw new Error(`Ghost config failed validation:\n${report}`);
  }

  // eslint-disable-next-line no-console
  console.error(
    `Ghost config failed validation (not enforced in the ${tree.env} environment):\n${report}`,
  );

  return deepFreeze(tree) as ValidatedConfig;
}

/**
 * `config.get()`, typed by the schema.
 *
 * A key path the schema covers resolves to that key's validated type, deeply
 * readonly to match the runtime freeze. Everything else keeps the `any` it has
 * always had, so no existing call site changes. A typo in an otherwise-known
 * path misses the first overload and lands on `any` rather than being silently
 * mistyped, which is the same outcome as today.
 */
interface TypedGet {
  <P extends ConfigPath>(key: P): ReadonlyDeep<ConfigAt<P>>;
  (key?: string): any;
}

export interface GhostConfig extends BoundHelpers, ConfigHelpers {
  get: TypedGet;
  /** The whole validated tree. `get()` is the usual way in. */
  readonly validated: ReadonlyDeep<ValidatedConfig>;
  /**
   * Override a key path and rebuild.
   *
   * For tests only - nothing in `core/` writes config, and boot does not either.
   * Each call rebuilds the whole tree from the loaded sources plus every
   * override recorded so far, so config is never briefly half-written.
   */
  set(key: string, value: unknown): void;
  /** Drop every override and rebuild. For tests only. */
  reset(callback?: () => void): void;
}

const MISS = Symbol('config.miss');

/**
 * Resolve a colon-separated path, returning MISS when a segment is absent or
 * traversal reaches a non-object. A present value of undefined is not a miss.
 */
function lookup(root: unknown, key: string): unknown {
  let node: unknown = root;

  for (const segment of key.split(':')) {
    if (node === null || typeof node !== 'object' || !(segment in node)) {
      return MISS;
    }

    node = (node as Record<string, unknown>)[segment];
  }

  return node;
}

/**
 * Write a colon-separated key path into a mutable tree, copying each level on
 * the way down if it is frozen. Missing or non-object intermediate values are
 * replaced with objects; the leaf is assigned by reference.
 *
 * An override's value is often something a test read back out of config, which
 * is frozen, so a later override targeting a path inside it would otherwise be
 * writing into a frozen object.
 */
function writePath(tree: Record<string, unknown>, key: string, value: unknown): void {
  const segments = key.split(':');
  const leaf = segments.pop() as string;
  let node = tree;

  for (const segment of segments) {
    const child = node[segment];

    if (child === null || typeof child !== 'object') {
      node[segment] = {};
    } else if (Object.isFrozen(child)) {
      node[segment] = Array.isArray(child) ? [...child] : { ...child };
    }

    node = node[segment] as Record<string, unknown>;
  }

  node[leaf] = value;
}

/**
 * Build Ghost's config from a merged source tree.
 *
 * nconf layers the sources (see ./loader.ts) and is then done with: the frozen,
 * validated tree this returns is the only representation anything reads. One
 * representation is what makes the whole config immutable rather than only the
 * part a schema names, and what will let the schema transform values later
 * without a raw read disagreeing with a transformed one.
 *
 * Clones the sources so the caller's tree is not frozen or retained by reference.
 * Propagates structuredClone errors for unsupported values and validation errors
 * from validateConfig; permissive validation may retain invalid values.
 */
export function createConfig(sources: Record<string, unknown>): GhostConfig {
  const base = structuredClone(sources);
  const overrides = new Map<string, unknown>();

  /** Build a frozen snapshot from the base and overrides, propagating validation errors. */
  function build(): ValidatedConfig {
    const tree = structuredClone(base);

    for (const [key, value] of overrides) {
      writePath(tree, key, value);
    }

    return validateConfig(tree);
  }

  let current = build();

  /** Replace the current snapshot only if building succeeds; propagate errors otherwise. */
  function rebuild(): void {
    current = build();
  }

  const config = {
    /**
     * Read a colon-separated path, or the whole snapshot when key is omitted.
     * Missing paths return undefined; object values are shared frozen references.
     * Previously returned objects are not updated by later set() or reset() calls.
     */
    get(key?: string): unknown {
      if (key === undefined) {
        return current;
      }

      const found = lookup(current, key);

      return found === MISS ? undefined : found;
    },

    /**
     * Set a test-only override at a colon-separated path, cloning the value so
     * the caller's object is not frozen. Other recorded overrides are retained.
     * Each override replaces the value at its path, including an entire subtree.
     * Overlapping paths are applied in the order they were first recorded;
     * updating an existing path does not move it after later overrides.
     * Cloning errors propagate; a failed rebuild restores the previous override
     * and rebuilds before rethrowing. Permissive validation accepts invalid values.
     */
    set(key: string, value: unknown): void {
      const had = overrides.has(key);
      const previous = overrides.get(key);

      // cloned, because rebuild() deep-freezes whatever ends up in the tree and
      // this value is the caller's own object
      overrides.set(key, structuredClone(value));

      try {
        rebuild();
      } catch (err) {
        // a rejected override must not stay recorded, or every later set()
        // reapplies it and throws again
        if (had) {
          overrides.set(key, previous);
        } else {
          overrides.delete(key);
        }

        rebuild();
        throw err;
      }
    },

    /**
     * Clear test overrides and rebuild from the original sources. Invoke callback
     * synchronously after success. Rebuild and callback errors propagate; cleared
     * overrides are not restored if rebuilding fails.
     */
    reset(callback?: () => void): void {
      overrides.clear();
      rebuild();
      callback?.();
    },
  };

  Object.defineProperty(config, 'validated', {
    get: () => current,
    enumerable: true,
    configurable: true,
  });

  bindUrlHelpers(config);
  bindHelpers(config as typeof config & BoundHelpers);

  return config as unknown as GhostConfig;
}
