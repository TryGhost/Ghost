import knex, { type Knex } from 'knex';
import type { Database } from '@tryghost/kernel/database';

/**
 * Builds the database handle from Knex options an application supplies. No
 * connection is opened until the first query.
 *
 * Call it once per process, from the application's bootstrap: each call is a
 * separate connection pool.
 */
export function createDatabase(options: Knex.Config): Database {
  return { knex: knex(options) };
}
