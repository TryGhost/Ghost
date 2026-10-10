import fs from 'node:fs';
import os from 'node:os';
import type { Knex } from 'knex';
import _ from 'lodash';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import config from '../../../shared/config';

const betterSqlitePatches = require('./better-sqlite3-patches');

/**
 * The slice of `database` config this module reads. Replace with the schema's
 * own type once `database` is schemafied.
 */
export interface DatabaseConfig {
  client?: string;
  connection?: Record<string, unknown>;
  useNullAsDefault?: boolean;
  [key: string]: unknown;
}

// @TODO:
// - if you require this file before config file was loaded,
// - then this file is cached and you have no chance to connect to the db anymore
// - bring dynamic into this file (db.connect())

/**
 * Build knex's config from Ghost's `database` config.
 *
 * Derives a new object rather than writing into what it was handed: that object
 * is config's own, and nconf's merge shares nested subtrees by reference, so the
 * old in-place version leaked `connection.timezone`, `connection.charset` and
 * `connection.decimalNumbers` into every later reader of `database`.
 */
export function configure(dbConfig: DatabaseConfig): Knex.Config {
  // Client aliases (mysql, sqlite3) are already resolved by config's
  // sanitizeDatabaseProperties.
  const client = dbConfig.client;
  const derived: DatabaseConfig = {
    ...dbConfig,
    connection: { ...dbConfig.connection },
  };
  const connection = derived.connection as Record<string, unknown>;

  if (client === 'better-sqlite3') {
    // Backwards compatibility with old knex behaviour
    derived.useNullAsDefault = Object.hasOwn(dbConfig, 'useNullAsDefault')
      ? dbConfig.useNullAsDefault
      : true;

    // Enables foreign key checks and delete on cascade
    // better-sqlite3 uses synchronous .pragma() method instead of async .run()
    derived.pool = {
      afterCreate(conn: { pragma(command: string): void }, cb: (err: null, conn: unknown) => void) {
        // better-sqlite3 exposes .pragma() method for setting PRAGMA commands
        conn.pragma('foreign_keys = ON');

        // These two are meant to improve performance at the cost of reliability
        // Should be safe for tests. We add them here and leave them on
        if (config.get('env').startsWith('testing')) {
          conn.pragma('synchronous = OFF');
          conn.pragma('journal_mode = TRUNCATE');
        }

        cb(null, conn);
      },
    };

    // In the default SQLite test config we set the path to /tmp/ghost-test.db,
    // but this won't work on Windows, so we need to replace the /tmp bit with
    // the Windows temp folder
    const filename = connection.filename;
    if (process.platform === 'win32' && _.isString(filename) && filename.match(/^\/tmp/)) {
      connection.filename = filename.replace(/^\/tmp/, os.tmpdir());
      logging.info(`Ghost DB path: ${connection.filename}`);
    }

    betterSqlitePatches.applyBetterSqlite3Patches();
  }

  if (client === 'mysql2') {
    connection.timezone = 'Z';
    connection.charset = 'utf8mb4';
    connection.decimalNumbers = true;

    if (process.env.REQUIRE_INFILE_STREAM) {
      if (process.env.NODE_ENV === 'development' || process.env.ALLOW_INFILE_STREAM) {
        connection.infileStreamFactory = (path: string) => fs.createReadStream(path);
      } else {
        throw new errors.InternalServerError({
          message:
            'MySQL infile streaming is required to run the current process, but is not allowed. Run the script in development mode or set ALLOW_INFILE_STREAM=1.',
        });
      }
    }
  }

  return derived as Knex.Config;
}
