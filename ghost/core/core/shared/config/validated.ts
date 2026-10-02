import type { ReadonlyDeep } from 'type-fest';
import { z } from 'zod';
import type Nconf from 'nconf';
import {
  configSchema,
  schemafiedPaths,
  type ConfigAt,
  type ConfigPath,
  type ValidatedConfig,
} from './schema';

/**
 * Recursively freeze a plain-data tree in place. Only safe on a structure
 * nothing else holds a reference to.
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
 * Validate the loaded config and return a deep-frozen, typed view of it.
 *
 * The clone matters: zod hands unvalidated subtrees straight through by
 * reference, so freezing the parse output without cloning first would freeze
 * nconf's own stores and break every test that writes config.
 */
export function validateConfig(nconf: Nconf.Provider): ValidatedConfig {
  const raw = structuredClone(nconf.get()) as Record<string, unknown>;
  const result = configSchema.safeParse(raw);

  if (result.success) {
    return deepFreeze(result.data);
  }

  const report = z.prettifyError(result.error);

  if (isStrict(String(raw.env))) {
    // new Error is allowed here, as we do not want config to depend on @tryghost/error
    // eslint-disable-next-line ghost/ghost-custom/no-native-error
    throw new Error(`Ghost config failed validation:\n${report}`);
  }

  // eslint-disable-next-line no-console
  console.error(
    `Ghost config failed validation (not enforced in the ${raw.env} environment):\n${report}`,
  );

  return deepFreeze(raw) as ValidatedConfig;
}

/**
 * `config.get()`, typed by the schema.
 *
 * A key path the schema covers resolves to that key's validated type, deeply
 * readonly to match the runtime freeze. Everything else keeps nconf's `any`, so
 * no existing call site changes. A typo in an otherwise-known path misses the
 * first overload and lands on `any` rather than being silently mistyped, which
 * is the same outcome as today.
 */
export interface TypedGet {
  <P extends ConfigPath>(key: P): ReadonlyDeep<ConfigAt<P>>;
  (key?: string): any;
}

export interface WithValidatedConfig {
  /** Validated, deep-frozen config. Prefer `get()`; this is for whole-tree reads. */
  readonly validated: ReadonlyDeep<ValidatedConfig>;
  get: TypedGet;
}

const MISS = Symbol('config.miss');

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
 * Validate the config and route the schema's own key paths through the frozen
 * result.
 *
 * Only paths the schema covers are rerouted. Everything else goes to nconf
 * untouched, so each key that gains a schema also gains - deliberately, in that
 * same change - a frozen value and a real type at every call site reading it.
 *
 * The frozen view is swappable so tests can keep writing config through nconf.
 */
export function attachValidatedConfig<T extends Nconf.Provider>(
  nconf: T,
): asserts nconf is T & WithValidatedConfig {
  const paths = schemafiedPaths();
  const nconfGet = nconf.get.bind(nconf);
  const nconfSet = nconf.set.bind(nconf);
  const nconfReset = nconf.reset.bind(nconf);

  let current: ValidatedConfig | undefined = validateConfig(nconf);

  // Writing through nconf drops the validated view instead of rebuilding it:
  // a test restoring config writes one key at a time, and re-validating
  // part-way through that would reject a config that is only briefly incomplete.
  const invalidate = <Fn extends (...args: never[]) => unknown>(fn: Fn): Fn =>
    function invalidating(this: unknown, ...args: Parameters<Fn>) {
      current = undefined;
      return fn(...args);
    } as Fn;

  const validated = (): ValidatedConfig => {
    current ??= validateConfig(nconf);
    return current;
  };

  Object.defineProperties(nconf, {
    validated: { get: validated, enumerable: true, configurable: true },
    get: {
      value: function get(key?: string) {
        if (key !== undefined && paths.has(key)) {
          const found = lookup(validated(), key);

          if (found !== MISS) {
            return found;
          }
        }

        return nconfGet(key as string);
      },
      enumerable: false,
      configurable: true,
      writable: true,
    },
    set: { value: invalidate(nconfSet), enumerable: false, configurable: true, writable: true },
    reset: { value: invalidate(nconfReset), enumerable: false, configurable: true, writable: true },
  });
}
