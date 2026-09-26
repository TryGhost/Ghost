import { z } from 'zod';
import type Nconf from 'nconf';
import { deepFreeze } from './freeze';
import { configSchema, type Config } from './schema';

const _debug = require('@tryghost/debug')._base;
const debug = _debug('ghost:config');

/**
 * Rebuild the typed snapshot from the underlying nconf store. Only tests need
 * this - they mutate config through nconf and then refresh. See
 * test/utils/config-utils.js.
 */
export const REFRESH_SNAPSHOT = Symbol.for('ghost.config.refreshSnapshot');

/**
 * Whether a schema violation is fatal.
 *
 * Production defaults to warn-only. Ghost(Pro) injects config through
 * environment variables that this repo cannot see, so a schema this repo got
 * subtly wrong would otherwise be a fleet-wide boot crash-loop rather than a
 * log line. Development and test boot strictly, and `GHOST_CONFIG_SCHEMA_STRICT`
 * overrides in either direction.
 */
function isStrict(env: string): boolean {
  const override = process.env.GHOST_CONFIG_SCHEMA_STRICT;

  if (override !== undefined) {
    return override === 'true';
  }

  return env !== 'production';
}

/**
 * Validate the loaded config and return a deep-frozen, typed view of it.
 *
 * The clone matters: zod hands unvalidated subtrees straight through by
 * reference, so freezing the parse output without cloning first would freeze
 * nconf's own stores and break every test that writes config.
 */
export function createSnapshot(nconf: Nconf.Provider): Config {
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
  console.error(`Ghost config failed validation (not enforced in production yet):\n${report}`);
  debug('config schema violation', report);

  return deepFreeze(raw) as Config;
}

/**
 * nconf methods callers still use on the exported config instance. A config key
 * of the same name would shadow the method and break every existing call site.
 *
 * `env` is deliberately absent: it *is* a config key, and shadowing
 * `Provider#env` is safe because the env store is only ever loaded through the
 * loader's own local handle, never through the export.
 */
const RESERVED = new Set(['get', 'set', 'reset']);

/**
 * Expose every schema key as a property on the config instance, reading from
 * the current snapshot.
 *
 * This is what lets call sites move off `config.get('a:b')` onto `config.a.b`
 * one file at a time: both read the same values for as long as nconf is still
 * underneath. The snapshot behind the accessors is swappable so tests can keep
 * mutating config, while everything handed out stays deep-frozen.
 */
export function attachAccessors<T extends Nconf.Provider>(
  nconf: T,
  initial: Config,
): asserts nconf is T & Config {
  const state = { current: initial };

  for (const key of Object.keys(configSchema.def.shape)) {
    if (RESERVED.has(key)) {
      // new Error is allowed here, as we do not want config to depend on @tryghost/error
      // eslint-disable-next-line ghost/ghost-custom/no-native-error
      throw new Error(`Config key "${key}" would shadow the nconf method of the same name`);
    }

    Object.defineProperty(nconf, key, {
      get: () => (state.current as Record<string, unknown>)[key],
      enumerable: true,
      configurable: true,
    });
  }

  Object.defineProperty(nconf, REFRESH_SNAPSHOT, {
    value: () => {
      state.current = createSnapshot(nconf);
    },
    enumerable: false,
    configurable: true,
  });
}
