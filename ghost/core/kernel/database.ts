import type { Knex } from 'knex';

/**
 * What code is handed when it reads or writes stored data. A type only:
 * importing this opens no connection.
 *
 * @see [Foundation types](./README.md#foundation-types)
 */
export interface Database {
  readonly knex: Knex;
}
