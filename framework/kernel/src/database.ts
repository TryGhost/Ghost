import type { Knex } from 'knex';

/** Which family of database a handle talks to. Ghost supports these two. */
export type Dialect = 'mysql' | 'sqlite';

/** What the database server says it is. Strings stay as `@tryghost/database-info` names them. */
export interface DatabaseServer {
  /** The driver knex uses, e.g. `better-sqlite3`, `mysql2`. */
  readonly driver: string;
  /** `SQLite`, `MySQL`, `MariaDB` or `unknown`. */
  readonly database: string;
  /** `sqlite3`, `mysql5`, `mysql8`, `mysql`, `mariadb` or `unknown`. Admin reads this one. */
  readonly engine: string;
  /** The server version, or `unknown`. */
  readonly version: string;
}

/**
 * What code is handed when it queries the database. A type only: importing it
 * connects to nothing, and building one (in the foundry) opens no connection
 * until the first query.
 *
 * Code that only queries reads `knex`. Code that writes SQL one dialect cannot
 * run reads `dialect` once, rather than asking the driver on every query.
 */
export interface Database {
  readonly knex: Knex;
  readonly dialect: Dialect;
  /**
   * Asks the server what it is on the first call and keeps the answer on this
   * handle, so nothing has to ask at start. Never rejects: what it cannot work
   * out is `'unknown'`.
   */
  server(): Promise<DatabaseServer>;
}

/** Whatever a query can run on: the handle's knex, or a transaction opened on it. */
export type Executor = Knex | Knex.Transaction;
