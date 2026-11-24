import type { Knex } from 'knex';

/**
 * What code is handed when it queries the database. A type only: importing it
 * connects to nothing.
 */
export interface Database {
  readonly knex: Knex;
}
