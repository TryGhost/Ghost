export declare const SQLITE_PRIMARY_RESULT_CODES: Readonly<Record<string, number>>;
export declare function getPrimarySqliteCode(code: unknown): string | undefined;
/** Returns what it is given; a better-sqlite3 error gains node-sqlite3's `errno` and primary `code`. */
export declare function normalizeSqliteError<E>(err: E): E;
export declare function expandArrayBindings<O extends { sql: string; bindings: unknown[] }>(
  obj: O,
): O;
export declare function formatBindings(bindings: unknown[] | null | undefined): unknown[];
/** Patches knex's better-sqlite3 Client once per process. False when the dialect is missing. */
export declare function applyBetterSqlite3Patches(): boolean;
