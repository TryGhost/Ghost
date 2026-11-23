import type { Config, Database } from '#kernel/foundation';

/**
 * EARMARKED. Ghost's config, which builds itself when `core/shared/config` is first loaded, from
 * the files, environment and arguments of the process.
 *
 * It leaves when the bootstrap builds config from values it names and `core/shared/config` returns
 * what it built.
 */
export function legacyConfig(): Config {
  return require('../../core/shared/config');
}

/**
 * EARMARKED. The database handle, which builds itself from config when `core/server/data/db` is
 * first read. Building it opens no connection.
 *
 * It leaves when the bootstrap builds the handle from config and `core/server/data/db` returns
 * what it built.
 */
export function legacyDatabase(): Database {
  return require('../../core/server/data/db').knex;
}
