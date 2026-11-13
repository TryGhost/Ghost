import type KnexMigrator from 'knex-migrator';
import * as database from '../../../db';

export default function shutdown(options: KnexMigrator.ShutdownHookContext = {}) {
  /**
   * We have to close Ghost's db connection if knex-migrator was used in the shell.
   * Otherwise the process doesn't exit.
   */
  if (options.executedFromShell === true) {
    return database.knex.destroy();
  }
}
