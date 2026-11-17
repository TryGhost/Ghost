import type { ReadonlyDeep } from 'type-fest';
import { bindAll as bindUrlHelpers, type BoundHelpers } from '@tryghost/config-url-helpers';
import type { z } from 'zod';
import {
  createConfig as createValidatedConfig,
  deepFreeze,
  validateConfig as validate,
  type ConfigPolicy,
} from '../../foundation/config';
import { bindAll as bindHelpers, type ConfigHelpers } from './helpers';
import { guardHint, shouldGuard } from './guard';
import { configSchema, type ConfigAt, type ConfigPath, type ValidatedConfig } from './schema';

// Ghost's side of config: its schema, when a violation is fatal, when writes
// throw, and the helpers bound to the instance. Building, validating and
// freezing the tree is the framework's: see ../../foundation/config.

export { deepFreeze };

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
 * Keys marked `.meta({fatal: true})` fail boot in every environment regardless.
 *
 * @TODO: removing this flag makes every required key a hard boot failure
 * everywhere - which is only safe once the schema is known to match what
 * Ghost(Pro) and self-hosters actually supply.
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

/** How Ghost's config is validated and made read-only. */
const policy: ConfigPolicy<typeof configSchema> = {
  schema: configSchema,
  name: 'Ghost config',
  strict: (tree) => isStrict(String(tree.env)),
  guard: (tree) => shouldGuard(String(tree.env)),
  guardHint,
};

/** Validate a config tree against Ghost's schema and make it read-only. Takes ownership of the tree. */
export function validateConfig(tree: Record<string, unknown>): ValidatedConfig {
  return validate(tree, policy) as ValidatedConfig;
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
  /** The value at `path`, parsed with the schema its reader declares. Throws when it does not fit. */
  slice<Schema extends z.ZodType>(path: string, schema: Schema): z.output<Schema>;
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

/**
 * Build Ghost's config from a merged source tree.
 *
 * nconf layers the sources (see ./loader.ts) and is then done with: the frozen,
 * validated tree this returns is the only representation anything reads.
 */
export function createConfig(sources: Record<string, unknown>): GhostConfig {
  const config = createValidatedConfig(sources, policy);

  bindUrlHelpers(config);
  bindHelpers(config as typeof config & BoundHelpers);

  return config as unknown as GhostConfig;
}
