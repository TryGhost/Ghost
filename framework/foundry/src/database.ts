import knex, { type Knex } from 'knex';
import type { Database, DatabaseServer, Dialect } from '@tryghost/kernel/database';
// A CommonJS library. Importing it builds nothing; this file builds one per ask.
import DatabaseInfo from '@tryghost/database-info';
import sqlite from './database/sqlite-compatibility.cjs';

/**
 * What a database handle is built from. The application's bootstrap works these
 * out from its own config; the foundry reads no config, file or environment.
 */
export type DatabaseOptions = MySQLOptions | SQLiteOptions;

interface CommonOptions {
  /**
   * Anything else knex takes, passed through unchanged: `pool`, `debug`,
   * `acquireConnectionTimeout` and so on.
   */
  readonly knex?: Omit<Knex.Config, 'client' | 'connection'>;
}

export interface MySQLOptions extends CommonOptions {
  readonly client: 'mysql2';
  /** Handed to mysql2. The foundry sets `timezone`, `charset` and `decimalNumbers` over it. */
  readonly connection: Readonly<Record<string, unknown>>;
  /**
   * Lets `LOAD DATA LOCAL INFILE` read local files, through this function. Off unless given.
   * Whether a process may do this is the application's decision, not the foundry's.
   */
  readonly infileStreamFactory?: (path: string) => NodeJS.ReadableStream;
}

export interface SQLiteOptions extends CommonOptions {
  readonly client: 'better-sqlite3';
  readonly connection: { readonly filename: string };
  /**
   * `'fast'` turns off fsync and keeps a truncated journal: quicker, and unsafe if the
   * machine stops mid-write. For throwaway databases such as tests. Default `'safe'`.
   */
  readonly durability?: 'safe' | 'fast';
}

/** A handle the foundry built, with the one thing only its builder may do: close it. */
export interface OwnedDatabase extends Database {
  /** Closes every pooled connection. A query after this fails. */
  close(): Promise<void>;
}

/**
 * Knex's config for these options. Pure apart from one thing: for SQLite it applies
 * the earmarked compatibility patch to knex's better-sqlite3 Client (once per process).
 *
 * Exported because knex-migrator builds its own knex from a config, and must build it
 * the way the application's handle is built.
 */
export function knexConfig(options: DatabaseOptions): Knex.Config {
  if (options.client === 'mysql2') {
    return {
      ...options.knex,
      client: 'mysql2',
      connection: {
        ...options.connection,
        // Every datetime column is read and written as UTC; the kernel's column codecs rely on it
        timezone: 'Z',
        charset: 'utf8mb4',
        // DECIMAL columns come back as numbers, as they do on SQLite
        decimalNumbers: true,
        ...(options.infileStreamFactory && {
          infileStreamFactory: options.infileStreamFactory,
        }),
      },
    };
  }

  sqlite.applyBetterSqlite3Patches();
  const fast = options.durability === 'fast';

  return {
    // SQLite has no DEFAULT keyword for an omitted column; knex inserts NULL instead
    useNullAsDefault: true,
    ...options.knex,
    client: 'better-sqlite3',
    connection: { filename: options.connection.filename },
    // Replaces any pool given: a SQLite file has one writer, and every connection needs these pragmas
    pool: {
      afterCreate(
        connection: { pragma(command: string): void },
        done: (err: null, connection: unknown) => void,
      ) {
        // Enforces foreign keys and ON DELETE CASCADE, which SQLite leaves off by default
        connection.pragma('foreign_keys = ON');
        if (fast) {
          connection.pragma('synchronous = OFF');
          connection.pragma('journal_mode = TRUNCATE');
        }
        done(null, connection);
      },
    },
  };
}

const dialects: Record<DatabaseOptions['client'], Dialect> = {
  mysql2: 'mysql',
  'better-sqlite3': 'sqlite',
};

/**
 * Builds a database handle. Opens no connection: knex connects on the first query.
 * Keeps nothing: the caller holds what it built, and closes it.
 */
export function createDatabase(options: DatabaseOptions): OwnedDatabase {
  const instance = knex(knexConfig(options));
  let server: Promise<DatabaseServer> | undefined;

  return Object.freeze({
    knex: instance,
    dialect: dialects[options.client],
    server() {
      server ??= describe(instance).then((found) => {
        // An answer worked out while the server could not be reached is not kept
        if (found.engine === 'unknown') {
          server = undefined;
        }
        return found;
      });
      return server;
    },
    close() {
      return instance.destroy();
    },
  });
}

async function describe(instance: Knex): Promise<DatabaseServer> {
  try {
    // @tryghost/database-info 2.5.0 has a stateless `describeDatabase`; until Ghost is on it,
    // the class is built for one answer and dropped.
    return await new DatabaseInfo(instance).init();
  } catch {
    return {
      driver: String(instance.client.config.client),
      database: 'unknown',
      engine: 'unknown',
      version: 'unknown',
    };
  }
}
