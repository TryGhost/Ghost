import type { ReadonlyDeep } from 'type-fest';
import _ from 'lodash';
import { z } from 'zod';
import { bindAll as bindUrlHelpers, type BoundHelpers } from '@tryghost/config-url-helpers';
import { bindAll as bindHelpers, type ConfigHelpers } from './helpers';
import { guardReadOnly, shouldGuard } from './guard';
import { configSchema, type ConfigAt, type ConfigPath, type ValidatedConfig } from './schema';

/**
 * Recursively freeze a plain-data tree in place. Only safe on a structure
 * nothing else holds a reference to, and an already-frozen subtree is left
 * alone, children included.
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
 * production deploy opts in once it trusts the schema.
 *
 * @TODO: removing this flag retires checkUrlProtocol() in ./utils.ts with it,
 * and makes every required key a hard boot failure everywhere - which is only
 * safe once the schema is known to match what Ghost(Pro) and self-hosters
 * actually supply.
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
 * Make a validated tree read-only: frozen in production, proxied in the
 * environments this repo runs itself so a write throws rather than being
 * dropped. See ./guard.ts.
 */
function readOnly(tree: Record<string, unknown>): ValidatedConfig {
  return (
    shouldGuard(String(tree.env)) ? guardReadOnly(tree) : deepFreeze(tree)
  ) as ValidatedConfig;
}

/**
 * Validate a config tree and make it read-only.
 *
 * Takes ownership of the tree: it is frozen in place, and zod passes keys the
 * schema does not name straight through by reference, so a shared tree would be
 * frozen out from under its other owner.
 */
export function validateConfig(tree: Record<string, unknown>): ValidatedConfig {
  const result = configSchema.safeParse(tree);

  if (result.success) {
    return readOnly(result.data as Record<string, unknown>);
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

  return readOnly(tree);
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
   *
   * One known difference from nconf: `set(key, undefined)` writes undefined into
   * the tree, where nconf left its lower-priority stores to answer the read. The
   * two cannot both be had without modelling the overrides as a separate layer
   * merged at read time, and this is the half the suite depends on - a test that
   * sets a parent object and then clears one leaf of it needs the leaf gone.
   * Nothing clears a key the config files actually provide, which is the only
   * case where the difference shows.
   */
  set(key: string, value: unknown): void;
  /** Drop every override and rebuild. For tests only. */
  reset(): void;
}

const MISS = Symbol('config.miss');

/** A key that is present but undefined is a hit, not a miss. */
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
 * Write a key path into a tree, copying each level on the way down.
 *
 * The copy is unconditional, because an override's value is written into every
 * later tree by reference and may be an object a caller still holds - usually
 * one a test read back out of config. Writing a deeper path in place would
 * reach back through both. Copying only when a level is frozen looks equivalent
 * but is not: under the guard nothing is frozen, so the same nested override
 * would mutate what an earlier `get()` returned.
 */
function writePath(tree: Record<string, unknown>, key: string, value: unknown): void {
  const segments = key.split(':');
  const leaf = segments.pop() as string;
  let node = tree;

  for (const segment of segments) {
    const child = node[segment];

    if (child === null || typeof child !== 'object') {
      node[segment] = {};
    } else {
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
 */
export function createConfig(sources: Record<string, unknown>): GhostConfig {
  const base = structuredClone(sources);
  const overrides = new Map<string, unknown>();

  function build(): ValidatedConfig {
    const tree = structuredClone(base);

    for (const [key, value] of overrides) {
      writePath(tree, key, value);
    }

    return validateConfig(tree);
  }

  let current = build();

  function rebuild(): void {
    current = build();
  }

  const config = {
    get(key?: string): unknown {
      if (key === undefined) {
        return current;
      }

      const found = lookup(current, key);

      return found === MISS ? undefined : found;
    },

    set(key: string, value: unknown): void {
      // Cloned first, before anything is recorded: cloning can throw - on a
      // value with a throwing getter, say - and doing it here means that throw
      // cannot leave `overrides` half-updated. cloneDeep rather than
      // structuredClone, because under the guard this value may be a proxy and
      // structuredClone rejects those.
      //
      // The clone itself is needed because rebuild() makes whatever ends up in
      // the tree read-only, and this value is the caller's own object.
      const cloned = _.cloneDeep(value);
      const previous = new Map(overrides);

      // deleted first so the key moves to the end: overrides replay in
      // insertion order, and Map.set on an existing key keeps its old position,
      // which would let an earlier write beat this one. Setting `paths` after
      // `paths:contentPath` has to win, as it does in nconf.
      overrides.delete(key);
      overrides.set(key, cloned);

      try {
        rebuild();
      } catch (err) {
        // a rejected override must not stay recorded, or every later set()
        // reapplies it and throws again
        overrides.clear();

        for (const [existingKey, existingValue] of previous) {
          overrides.set(existingKey, existingValue);
        }

        rebuild();
        throw err;
      }
    },

    reset(): void {
      overrides.clear();
      rebuild();
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
