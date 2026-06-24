const luxon = require('luxon');
const moment = require('moment-timezone');

/**
 * force UTC
 *   - old way: you can require moment or moment-timezone
 *   - new way: you should use Luxon - work is in progress to switch from moment.
 *
 *   - you are allowed to use new Date() to instantiate datetime values for models, because they are transformed into UTC in the model layer
 *   - be careful when not working with models, every value from the native JS Date is local TZ
 *   - be careful when you work with date operations, therefore always wrap a date with our timezone library
 */
luxon.Settings.defaultZone = 'UTC';
moment.tz.setDefault('UTC');

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
 * Monkey-patch better-sqlite3 Knex client to auto-expand array bindings
 * This maintains compatibility with MySQL/sqlite3 where IN (?) with array bindings works automatically
 */
try {
    const BetterSqlite3Client = require('knex/lib/dialects/better-sqlite3/index.js');
    const originalQuery = BetterSqlite3Client.prototype._query;

    BetterSqlite3Client.prototype._query = function (connection, obj) {
        // Expand array bindings before executing query
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
        // Normalize better-sqlite3 errors so they carry a node-sqlite3-compatible
        // `errno`, matching what the rest of Ghost's error handling expects.
        return originalQuery.call(this, connection, obj).catch((err) => {
            throw normalizeSqliteError(err);
        });
    };

    // better-sqlite3 binds every JS `number` as a SQLite REAL (float). When an
    // integer is written to a TEXT-affinity column this stores "500.0" instead of
    // "500" — node-sqlite3 bound integers as INTEGER, giving "500". Bind safe
    // integers as BigInt to restore INTEGER affinity and keep better-sqlite3 a
    // faithful drop-in for sqlite3. (Date/boolean handling matches the dialect's
    // original _formatBindings.)
    BetterSqlite3Client.prototype._formatBindings = function (bindings) {
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
    };
} catch (err) {
    // better-sqlite3 dialect may not be available in production, which is fine
}
