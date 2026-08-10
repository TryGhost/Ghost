/**
 * better-sqlite3 compatibility patches
 *
 * Ghost historically ran on the node-sqlite3 driver. better-sqlite3 is now used
 * as a drop-in replacement, but it differs from node-sqlite3 in a few behaviours
 * that the rest of Ghost relies on. This module re-creates the old behaviour by
 * monkey-patching the Knex better-sqlite3 dialect.
 *
 * The individual helpers are exported so they can be unit-tested in isolation —
 * they sit in the critical path for the development server.
 */

/**
 * SQLite primary result codes, keyed by the string `code` that better-sqlite3
 * exposes on its errors. These numbers match the `errno` that the old node-sqlite3
 * driver set, which Ghost's error handling still branches on (e.g. mapping an
 * unknown-column query to a 400 BadRequestError rather than a 500). better-sqlite3
 * only sets a string `code` and leaves `errno` undefined, so we re-derive it below.
 * @see https://www.sqlite.org/rescode.html
 */
const SQLITE_PRIMARY_RESULT_CODES = {
    SQLITE_ERROR: 1,
    SQLITE_INTERNAL: 2,
    SQLITE_PERM: 3,
    SQLITE_ABORT: 4,
    SQLITE_BUSY: 5,
    SQLITE_LOCKED: 6,
    SQLITE_NOMEM: 7,
    SQLITE_READONLY: 8,
    SQLITE_INTERRUPT: 9,
    SQLITE_IOERR: 10,
    SQLITE_CORRUPT: 11,
    SQLITE_NOTFOUND: 12,
    SQLITE_FULL: 13,
    SQLITE_CANTOPEN: 14,
    SQLITE_PROTOCOL: 15,
    SQLITE_EMPTY: 16,
    SQLITE_SCHEMA: 17,
    SQLITE_TOOBIG: 18,
    SQLITE_CONSTRAINT: 19,
    SQLITE_MISMATCH: 20,
    SQLITE_MISUSE: 21,
    SQLITE_NOLFS: 22,
    SQLITE_AUTH: 23,
    SQLITE_FORMAT: 24,
    SQLITE_RANGE: 25,
    SQLITE_NOTADB: 26,
    SQLITE_NOTICE: 27,
    SQLITE_WARNING: 28
};

/**
 * Resolve the primary result code name for a better-sqlite3 error `code`.
 * better-sqlite3 reports extended codes (e.g. 'SQLITE_CONSTRAINT_UNIQUE'), whereas
 * node-sqlite3 reported the primary code ('SQLITE_CONSTRAINT'). Exact primary codes
 * are returned as-is; extended codes resolve to their primary prefix.
 *
 * @param {string} code
 * @returns {string|undefined}
 */
function getPrimarySqliteCode(code) {
    if (typeof code !== 'string') {
        return undefined;
    }

    if (Object.prototype.hasOwnProperty.call(SQLITE_PRIMARY_RESULT_CODES, code)) {
        return code;
    }

    for (const name of Object.keys(SQLITE_PRIMARY_RESULT_CODES)) {
        if (code.startsWith(`${name}_`)) {
            return name;
        }
    }

    return undefined;
}

/**
 * Make a better-sqlite3 error look like the old node-sqlite3 driver's error so that
 * the existing error checks throughout Ghost keep working as a drop-in replacement:
 *   - `err.code` is reshaped to the primary code string (e.g. 'SQLITE_CONSTRAINT'),
 *     matching checks like `err.code === 'SQLITE_CONSTRAINT'` (labels/members/snippets).
 *   - `err.errno` is populated with the numeric primary result code, matching checks
 *     like `err.errno === 1` (crud.js / @tryghost/bookshelf-pagination).
 * better-sqlite3 errors are identified by a string SQLITE_* `code` with no `errno`.
 *
 * @param {Error & {code?: string, errno?: number}} err
 * @returns {Error & {code?: string, errno?: number}}
 */
function normalizeSqliteError(err) {
    if (err && err.errno === undefined && typeof err.code === 'string' && err.code.startsWith('SQLITE_')) {
        const primaryCode = getPrimarySqliteCode(err.code);

        if (primaryCode !== undefined) {
            err.errno = SQLITE_PRIMARY_RESULT_CODES[primaryCode];
            err.code = primaryCode;
        }
    }

    return err;
}

/**
 * Expand array bindings in a Knex query object in place, mutating `obj.sql` and
 * `obj.bindings`. MySQL/node-sqlite3 automatically expand `IN (?)` with an array
 * binding into `IN (?, ?, ?)`; better-sqlite3 does not, so we do it here to keep
 * it a faithful drop-in. Each `?` placeholder is matched to its binding in order,
 * and array bindings are expanded into one placeholder per element.
 *
 * @param {{sql: string, bindings: any[]}} obj
 * @returns {{sql: string, bindings: any[]}}
 */
function expandArrayBindings(obj) {
    if (obj.bindings && obj.bindings.length > 0) {
        let bindingIndex = 0;
        const expandedBindings = [];

        // Replace each ? placeholder, expanding arrays into multiple placeholders
        obj.sql = obj.sql.replace(/\?/g, () => {
            if (bindingIndex >= obj.bindings.length) {
                return '?';
            }

            const binding = obj.bindings[bindingIndex];
            bindingIndex += 1;

            if (Array.isArray(binding)) {
                // Expand array into multiple ? placeholders
                expandedBindings.push(...binding);
                return binding.map(() => '?').join(', ');
            } else {
                expandedBindings.push(binding);
                return '?';
            }
        });

        obj.bindings = expandedBindings;
    }

    return obj;
}

/**
 * Format Knex bindings for better-sqlite3.
 *
 * better-sqlite3 binds every JS `number` as a SQLite REAL (float). When an
 * integer is written to a TEXT-affinity column this stores "500.0" instead of
 * "500" — node-sqlite3 bound integers as INTEGER, giving "500". Bind safe
 * integers as BigInt to restore INTEGER affinity and keep better-sqlite3 a
 * faithful drop-in for sqlite3. (Date/boolean handling matches the dialect's
 * original _formatBindings.)
 *
 * @param {any[]} bindings
 * @returns {any[]}
 */
function formatBindings(bindings) {
    if (!bindings) {
        return [];
    }

    return bindings.map((binding) => {
        if (binding instanceof Date) {
            return binding.valueOf();
        }

        if (typeof binding === 'boolean') {
            return Number(binding);
        }

        if (typeof binding === 'number' && Number.isInteger(binding) && Number.isSafeInteger(binding)) {
            return BigInt(binding);
        }

        return binding;
    });
}

/**
 * Monkey-patch the Knex better-sqlite3 dialect so that it behaves like the old
 * node-sqlite3 driver Ghost used to depend on:
 *   - array bindings are auto-expanded (see {@link expandArrayBindings})
 *   - errors are normalized to carry a node-sqlite3-compatible `errno`/`code`
 *     (see {@link normalizeSqliteError})
 *   - integer bindings keep INTEGER affinity (see {@link formatBindings})
 *
 * Safe to call when the dialect isn't installed (e.g. production builds without
 * better-sqlite3) — it returns `false` instead of throwing.
 *
 * @returns {boolean} whether the patches were applied
 */
function applyBetterSqlite3Patches() {
    try {
        const BetterSqlite3Client = require('knex/lib/dialects/better-sqlite3/index.js');
        const originalQuery = BetterSqlite3Client.prototype._query;

        BetterSqlite3Client.prototype._query = function (connection, obj) {
            // Expand array bindings before executing query
            expandArrayBindings(obj);

            // Normalize better-sqlite3 errors so they carry a node-sqlite3-compatible
            // `errno`, matching what the rest of Ghost's error handling expects.
            return originalQuery.call(this, connection, obj).catch((err) => {
                throw normalizeSqliteError(err);
            });
        };

        BetterSqlite3Client.prototype._formatBindings = function (bindings) {
            return formatBindings(bindings);
        };

        return true;
    } catch (err) {
        // better-sqlite3 dialect may not be available in production, which is fine
        return false;
    }
}

module.exports = {
    SQLITE_PRIMARY_RESULT_CODES,
    getPrimarySqliteCode,
    normalizeSqliteError,
    expandArrayBindings,
    formatBindings,
    applyBetterSqlite3Patches
};
