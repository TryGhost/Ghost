const assert = require('node:assert/strict');

const patches = require('../../../../../core/server/data/db/better-sqlite3-patches');
const {
    SQLITE_PRIMARY_RESULT_CODES,
    getPrimarySqliteCode,
    normalizeSqliteError,
    expandArrayBindings,
    formatBindings,
    applyBetterSqlite3Patches
} = patches;

describe('better-sqlite3 patches', function () {
    describe('getPrimarySqliteCode', function () {
        it('returns an exact primary code as-is', function () {
            assert.equal(getPrimarySqliteCode('SQLITE_CONSTRAINT'), 'SQLITE_CONSTRAINT');
            assert.equal(getPrimarySqliteCode('SQLITE_ERROR'), 'SQLITE_ERROR');
        });

        it('resolves an extended code to its primary prefix', function () {
            assert.equal(getPrimarySqliteCode('SQLITE_CONSTRAINT_UNIQUE'), 'SQLITE_CONSTRAINT');
            assert.equal(getPrimarySqliteCode('SQLITE_IOERR_READ'), 'SQLITE_IOERR');
        });

        it('returns undefined for an unknown code', function () {
            assert.equal(getPrimarySqliteCode('SQLITE_NOPE'), undefined);
            assert.equal(getPrimarySqliteCode('NOT_SQLITE'), undefined);
        });

        it('returns undefined for non-string input', function () {
            assert.equal(getPrimarySqliteCode(undefined), undefined);
            assert.equal(getPrimarySqliteCode(null), undefined);
            assert.equal(getPrimarySqliteCode(19), undefined);
        });
    });

    describe('normalizeSqliteError', function () {
        it('adds a numeric errno and primary code to a better-sqlite3 error', function () {
            const err = new Error('UNIQUE constraint failed');
            err.code = 'SQLITE_CONSTRAINT_UNIQUE';

            const result = normalizeSqliteError(err);

            assert.equal(result, err, 'mutates and returns the same error');
            assert.equal(err.code, 'SQLITE_CONSTRAINT');
            assert.equal(err.errno, SQLITE_PRIMARY_RESULT_CODES.SQLITE_CONSTRAINT);
            assert.equal(err.errno, 19);
        });

        it('normalizes a primary code error', function () {
            const err = new Error('no such column');
            err.code = 'SQLITE_ERROR';

            normalizeSqliteError(err);

            assert.equal(err.code, 'SQLITE_ERROR');
            assert.equal(err.errno, 1);
        });

        it('leaves an error that already has an errno untouched', function () {
            const err = new Error('already normalized');
            err.code = 'SQLITE_CONSTRAINT';
            err.errno = 19;

            normalizeSqliteError(err);

            assert.equal(err.code, 'SQLITE_CONSTRAINT');
            assert.equal(err.errno, 19);
        });

        it('leaves a non-SQLITE error untouched', function () {
            const err = new Error('some other error');
            err.code = 'ECONNREFUSED';

            normalizeSqliteError(err);

            assert.equal(err.code, 'ECONNREFUSED');
            assert.equal(err.errno, undefined);
        });

        it('leaves an unknown SQLITE code untouched (no errno set)', function () {
            const err = new Error('mystery');
            err.code = 'SQLITE_MYSTERY';

            normalizeSqliteError(err);

            assert.equal(err.code, 'SQLITE_MYSTERY');
            assert.equal(err.errno, undefined);
        });

        it('handles a falsy error without throwing', function () {
            assert.equal(normalizeSqliteError(null), null);
            assert.equal(normalizeSqliteError(undefined), undefined);
        });

        it('ignores an error without a string code', function () {
            const err = new Error('no code');

            normalizeSqliteError(err);

            assert.equal(err.errno, undefined);
        });
    });

    describe('expandArrayBindings', function () {
        it('expands a single array binding into multiple placeholders', function () {
            const obj = {
                sql: 'select * from posts where id in (?)',
                bindings: [[1, 2, 3]]
            };

            expandArrayBindings(obj);

            assert.equal(obj.sql, 'select * from posts where id in (?, ?, ?)');
            assert.deepEqual(obj.bindings, [1, 2, 3]);
        });

        it('leaves scalar bindings unchanged', function () {
            const obj = {
                sql: 'select * from posts where id = ? and status = ?',
                bindings: [5, 'published']
            };

            expandArrayBindings(obj);

            assert.equal(obj.sql, 'select * from posts where id = ? and status = ?');
            assert.deepEqual(obj.bindings, [5, 'published']);
        });

        it('handles a mix of scalar and array bindings in order', function () {
            const obj = {
                sql: 'select * from posts where status = ? and id in (?) and type = ?',
                bindings: ['published', [1, 2], 'post']
            };

            expandArrayBindings(obj);

            assert.equal(obj.sql, 'select * from posts where status = ? and id in (?, ?) and type = ?');
            assert.deepEqual(obj.bindings, ['published', 1, 2, 'post']);
        });

        it('returns the same object it was given', function () {
            const obj = {sql: 'select 1', bindings: []};
            assert.equal(expandArrayBindings(obj), obj);
        });

        it('leaves placeholders without a matching binding as-is', function () {
            const obj = {
                sql: 'select ? , ?',
                bindings: [42]
            };

            expandArrayBindings(obj);

            assert.equal(obj.sql, 'select ? , ?');
            assert.deepEqual(obj.bindings, [42]);
        });

        it('does nothing when there are no bindings', function () {
            const obj = {
                sql: 'select * from posts',
                bindings: []
            };

            expandArrayBindings(obj);

            assert.equal(obj.sql, 'select * from posts');
            assert.deepEqual(obj.bindings, []);
        });
    });

    describe('formatBindings', function () {
        it('returns an empty array for falsy bindings', function () {
            assert.deepEqual(formatBindings(undefined), []);
            assert.deepEqual(formatBindings(null), []);
        });

        it('converts Date bindings to their numeric value', function () {
            const date = new Date('2020-01-01T00:00:00.000Z');
            assert.deepEqual(formatBindings([date]), [date.valueOf()]);
        });

        it('converts boolean bindings to numbers', function () {
            assert.deepEqual(formatBindings([true, false]), [1, 0]);
        });

        it('converts safe integers to BigInt to keep INTEGER affinity', function () {
            const result = formatBindings([500]);
            assert.equal(typeof result[0], 'bigint');
            assert.equal(result[0], 500n);
        });

        it('leaves non-integer numbers as-is', function () {
            const result = formatBindings([3.14]);
            assert.equal(typeof result[0], 'number');
            assert.equal(result[0], 3.14);
        });

        it('leaves unsafe integers as-is (cannot be represented as a safe integer)', function () {
            const unsafe = Number.MAX_SAFE_INTEGER + 1;
            const result = formatBindings([unsafe]);
            assert.equal(typeof result[0], 'number');
            assert.equal(result[0], unsafe);
        });

        it('leaves strings and other bindings untouched', function () {
            const result = formatBindings(['hello', null]);
            assert.deepEqual(result, ['hello', null]);
        });

        it('formats a mixed set of bindings', function () {
            const date = new Date('2021-06-30T12:00:00.000Z');
            const result = formatBindings([date, true, 7, 'x', 1.5]);
            assert.deepEqual(result, [date.valueOf(), 1, 7n, 'x', 1.5]);
        });
    });

    describe('applyBetterSqlite3Patches', function () {
        let BetterSqlite3Client;
        let originalQuery;
        let originalFormatBindings;

        beforeAll(function () {
            // Capture the unpatched dialect methods so we can restore them after,
            // since the patch mutates the shared prototype.
            BetterSqlite3Client = require('knex/lib/dialects/better-sqlite3/index.js');
            originalQuery = BetterSqlite3Client.prototype._query;
            originalFormatBindings = BetterSqlite3Client.prototype._formatBindings;
        });

        afterAll(function () {
            BetterSqlite3Client.prototype._query = originalQuery;
            BetterSqlite3Client.prototype._formatBindings = originalFormatBindings;
        });

        it('returns true and patches the dialect prototype', function () {
            const applied = applyBetterSqlite3Patches();

            assert.equal(applied, true);
            assert.notEqual(BetterSqlite3Client.prototype._query, originalQuery);
            assert.notEqual(BetterSqlite3Client.prototype._formatBindings, originalFormatBindings);
        });

        it('patched _formatBindings restores INTEGER affinity', function () {
            applyBetterSqlite3Patches();

            const result = BetterSqlite3Client.prototype._formatBindings([500, true]);

            assert.equal(result[0], 500n);
            assert.equal(result[1], 0 + 1);
        });

        it('patched _query expands array bindings before delegating to the original', async function () {
            let seen;
            // Install a stub as the "original" _query that records what it receives,
            // then patch on top of it.
            BetterSqlite3Client.prototype._query = function (connection, queryObj) {
                seen = queryObj;
                return Promise.resolve();
            };
            applyBetterSqlite3Patches();

            const obj = {sql: 'select * from posts where id in (?)', bindings: [[1, 2, 3]]};
            await BetterSqlite3Client.prototype._query.call({}, {}, obj);

            assert.equal(seen.sql, 'select * from posts where id in (?, ?, ?)');
            assert.deepEqual(seen.bindings, [1, 2, 3]);
        });

        it('patched _query normalizes rejected errors', async function () {
            // Re-establish a clean baseline original that rejects with a raw
            // better-sqlite3-style error.
            BetterSqlite3Client.prototype._query = function () {
                const err = new Error('UNIQUE constraint failed');
                err.code = 'SQLITE_CONSTRAINT_PRIMARYKEY';
                return Promise.reject(err);
            };
            applyBetterSqlite3Patches();

            await assert.rejects(
                BetterSqlite3Client.prototype._query.call({}, {}, {sql: 'insert', bindings: []}),
                (err) => {
                    assert.equal(err.code, 'SQLITE_CONSTRAINT');
                    assert.equal(err.errno, 19);
                    return true;
                }
            );
        });
    });
});
