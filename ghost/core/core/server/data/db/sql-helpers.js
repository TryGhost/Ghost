/**
 * Small dialect-portability helpers for the places Ghost talks to knex directly.
 * MySQL (mysql2), SQLite (better-sqlite3) and Postgres (pg) all surface errors,
 * raw results and a few SQL functions differently.
 */

const UNIQUE_VIOLATION_CODES = new Set(['ER_DUP_ENTRY', '23505']);
const FOREIGN_KEY_CODES = new Set([
  'ER_NO_REFERENCED_ROW',
  'ER_NO_REFERENCED_ROW_2',
  'ER_ROW_IS_REFERENCED',
  'ER_ROW_IS_REFERENCED_2',
  '23503',
  'SQLITE_CONSTRAINT_FOREIGNKEY',
]);
const UNKNOWN_COLUMN_CODES = new Set(['ER_BAD_FIELD_ERROR', '42703']);

/**
 * @param {unknown} err
 * @returns {boolean} true when the error is a unique constraint violation
 */
function isDuplicateEntryError(err) {
  const code = err && typeof err === 'object' ? /** @type {any} */ (err).code : undefined;
  if (typeof code !== 'string') {
    return false;
  }
  return UNIQUE_VIOLATION_CODES.has(code) || code.startsWith('SQLITE_CONSTRAINT');
}

/**
 * @param {unknown} err
 * @returns {boolean} true when the error is a foreign key constraint violation
 */
function isForeignKeyError(err) {
  const e = /** @type {any} */ (err) || {};
  if (e.errno === 1452 || e.errno === 1451) {
    return true;
  }
  if (typeof e.code !== 'string') {
    return false;
  }
  if (FOREIGN_KEY_CODES.has(e.code)) {
    return true;
  }
  return e.code === 'SQLITE_CONSTRAINT' && /FOREIGN KEY constraint failed/.test(e.message || '');
}

/**
 * @param {unknown} err
 * @returns {boolean} true when the error is an unknown column / bad field error
 */
function isUnknownColumnError(err) {
  const e = /** @type {any} */ (err) || {};
  return e.errno === 1054 || e.errno === 1 || UNKNOWN_COLUMN_CODES.has(e.code);
}

/**
 * Normalises the result of `knex.raw()` to an array of rows.
 * mysql2 returns `[rows, fields]`, pg returns `{rows}`, sqlite returns `rows`.
 *
 * @param {any} result
 * @returns {any[]}
 */
function rawRows(result) {
  if (result && Array.isArray(result.rows)) {
    return result.rows;
  }
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0];
  }
  return Array.isArray(result) ? result : [];
}

/**
 * Quotes an identifier for the connected dialect (backticks on MySQL, double quotes on Postgres).
 *
 * @param {import('knex').Knex} knex
 * @param {string} identifier
 * @returns {string}
 */
function quoteIdentifier(knex, identifier) {
  return knex.client.wrapIdentifier(identifier);
}

/**
 * Comma-joined aggregate of a column, as `GROUP_CONCAT` on MySQL/SQLite and `string_agg` on Postgres.
 *
 * @param {import('knex').Knex} knex
 * @param {string} column
 * @param {string} alias
 * @returns {import('knex').Knex.Raw}
 */
function groupConcat(knex, column, alias) {
  if (knex.client.config.client === 'pg') {
    return knex.raw("string_agg(??::text, ',') as ??", [column, alias]);
  }
  return knex.raw('GROUP_CONCAT(??) as ??', [column, alias]);
}

module.exports = {
  isDuplicateEntryError,
  isForeignKeyError,
  isUnknownColumnError,
  rawRows,
  quoteIdentifier,
  groupConcat,
};
