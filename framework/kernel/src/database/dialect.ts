import type { Dialect } from '../database.ts';

/** The part of a knex handle or transaction the dialect is read from. */
interface HasClient {
  readonly client: { readonly dialect?: unknown; readonly config?: { readonly client?: unknown } };
}

/**
 * The dialect a knex handle or transaction talks to, for code that is handed a
 * bare knex rather than a `Database`. Prefer `database.dialect` when you have one.
 *
 * Knex sets `client.dialect` to `'sqlite3'` for both SQLite drivers and to
 * `'mysql'` for both MySQL drivers, including any Client subclass, so this does
 * not depend on what string a config happened to name. Test doubles that only
 * carry `client.config.client` are read from that.
 *
 * Throws for any other database: Ghost supports these two, and code that picks
 * SQL by dialect has no right answer for a third.
 *
 * The same logic is `getDialect` in `@tryghost/database-info/dialect` (2.5.0,
 * not yet published). Once Ghost is on that version this file re-exports it.
 */
export function dialectOf(executor: HasClient): Dialect {
  const named = executor.client.dialect ?? executor.client.config?.client;

  if (named === 'mysql' || named === 'mysql2') {
    return 'mysql';
  }

  if (named === 'sqlite3' || named === 'better-sqlite3') {
    return 'sqlite';
  }

  throw new TypeError(`Unsupported database dialect: ${String(named)}`);
}

export const isMySQL = (executor: HasClient): boolean => dialectOf(executor) === 'mysql';

export const isSQLite = (executor: HasClient): boolean => dialectOf(executor) === 'sqlite';
