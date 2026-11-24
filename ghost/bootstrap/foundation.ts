import type { Foundation } from '#kernel/foundation';
// Still built the old way, when this module is first loaded. Building it moves to the foundry later.
import config from '../core/shared/config';
import { buildLogger } from './logging';
import { legacyDatabase } from './transition/legacy-database';

const errors: typeof import('@tryghost/errors') = require('@tryghost/errors');

let foundation: Foundation | undefined;

/**
 * Ghost's foundation: what the rest of Ghost is handed instead of importing
 * config, the logger or the database for itself. It is assembled on the first
 * call, by boot, and this is the only place it is held.
 *
 * The database is built by the foundry from Ghost's options. It is the same handle
 * `core/server/data/db` returns, so code that is handed it and code that still
 * imports that module query through one connection pool.
 */
export function ghostFoundation(): Foundation {
  if (!foundation) {
    const logging = buildLogger(config);
    const database = legacyDatabase();

    if (!database) {
      throw new errors.IncorrectUsageError({
        message: 'Ghost cannot start without a database: config names no database client.',
      });
    }

    foundation = { config, logging, database };
  }

  return foundation;
}
