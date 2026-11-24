import type { OwnedDatabase } from '#foundry/database';
import { buildDatabase } from '../database';

/**
 * EARMARKED. Ghost's one database handle for the whole process, built on first ask.
 *
 * It exists because about 30 files in `core/server` and 90 test files import
 * `core/server/data/db` and read `.knex` from it, and must all get the handle that
 * boot hands to new code. `core/server/data/db` reads it from here; it holds nothing
 * itself. It leaves when those importers are handed the database instead, and a
 * process (or, later, a site) holds its own handle.
 *
 * It is built from the config and logger modules because the code that asks for it
 * first may load before boot, as tests and command-line tools do.
 */
let built: OwnedDatabase | undefined;

export function legacyDatabase(): OwnedDatabase | undefined {
  built ??= buildDatabase(require('../../core/shared/config'), require('@tryghost/logging'));
  return built;
}

/**
 * Closes the handle and forgets it, so the next ask builds one from config as it is
 * then. For tests that change `database` config, and for a command that ends the
 * process. Without it, the first file to load the database fixed its config for
 * every later file in the same worker.
 */
export async function resetLegacyDatabase(): Promise<void> {
  const closing = built;
  built = undefined;
  await closing?.close();
}
