const assert = require('assert/strict');
const {
    parseOrder,
    ensureIdTiebreaker,
    encodeCursor,
    decodeCursor,
    buildKeysetCondition,
    extractCursorValues
} = require('../../../../../core/server/services/comments/cursor-utils');

describe('cursor-utils', function () {
    describe('parseOrder', function () {
        it('parses a simple DESC order', function () {
            const result = parseOrder('created_at DESC, id DESC');
            assert.deepEqual(result, [
                {field: 'created_at', direction: 'desc'},
                {field: 'id', direction: 'desc'}
            ]);
        });

        it('parses a simple ASC order', function () {
            const result = parseOrder('created_at ASC, id ASC');
            assert.deepEqual(result, [
                {field: 'created_at', direction: 'asc'},
                {field: 'id', direction: 'asc'}
            ]);
        });

        it('parses mixed directions', function () {
            const result = parseOrder('count__likes DESC, created_at DESC, id DESC');
            assert.deepEqual(result, [
                {field: 'count__likes', direction: 'desc'},
                {field: 'created_at', direction: 'desc'},
                {field: 'id', direction: 'desc'}
            ]);
        });

        it('defaults to asc when direction is missing', function () {
            const result = parseOrder('created_at');
            assert.deepEqual(result, [
                {field: 'created_at', direction: 'asc'}
            ]);
        });

        it('returns empty array for empty/null input', function () {
            assert.deepEqual(parseOrder(''), []);
            assert.deepEqual(parseOrder(null), []);
            assert.deepEqual(parseOrder(undefined), []);
        });

        it('handles case insensitivity', function () {
            const result = parseOrder('Created_At DESC, ID desc');
            assert.deepEqual(result, [
                {field: 'created_at', direction: 'desc'},
                {field: 'id', direction: 'desc'}
            ]);
        });
    });

    describe('ensureIdTiebreaker', function () {
        it('appends id with same direction as last field', function () {
            const order = [{field: 'created_at', direction: 'desc'}];
            const result = ensureIdTiebreaker(order);
            assert.deepEqual(result, [
                {field: 'created_at', direction: 'desc'},
                {field: 'id', direction: 'desc'}
            ]);
        });

        it('does not duplicate id if already present', function () {
            const order = [
                {field: 'created_at', direction: 'desc'},
                {field: 'id', direction: 'desc'}
            ];
            const result = ensureIdTiebreaker(order);
            assert.deepEqual(result, order);
        });

        it('returns id desc for empty order', function () {
            const result = ensureIdTiebreaker([]);
            assert.deepEqual(result, [{field: 'id', direction: 'desc'}]);
        });

        it('uses asc direction when last field is asc', function () {
            const order = [{field: 'created_at', direction: 'asc'}];
            const result = ensureIdTiebreaker(order);
            assert.deepEqual(result, [
                {field: 'created_at', direction: 'asc'},
                {field: 'id', direction: 'asc'}
            ]);
        });
    });

    describe('encodeCursor / decodeCursor', function () {
        it('roundtrips cursor values', function () {
            const values = {created_at: '2025-01-15T10:30:00.000Z', id: '65a8f3abc123'};
            const encoded = encodeCursor(values);
            const decoded = decodeCursor(encoded);
            assert.deepEqual(decoded, values);
        });

        it('handles "Best" sort cursor with count__likes', function () {
            const values = {count__likes: 42, created_at: '2025-01-15T10:30:00.000Z', id: '65a8f3abc123'};
            const encoded = encodeCursor(values);
            const decoded = decodeCursor(encoded);
            assert.deepEqual(decoded, values);
        });

        it('produces a base64url string', function () {
            const encoded = encodeCursor({id: 'test'});
            // base64url should not contain +, /, or =
            assert.ok(!encoded.includes('+'), 'should not contain +');
            assert.ok(!encoded.includes('/'), 'should not contain /');
        });

        it('throws on invalid cursor string', function () {
            assert.throws(() => decodeCursor('not-valid-base64!!!'), /Invalid cursor/);
        });

        it('throws when cursor decodes to non-object', function () {
            const encoded = Buffer.from('"just a string"', 'utf8').toString('base64url');
            assert.throws(() => decodeCursor(encoded), /Invalid cursor: must decode to an object/);
        });

        it('throws when cursor decodes to array', function () {
            const encoded = Buffer.from('[1,2,3]', 'utf8').toString('base64url');
            assert.throws(() => decodeCursor(encoded), /Invalid cursor: must decode to an object/);
        });

        it('throws when cursor decodes to null', function () {
            const encoded = Buffer.from('null', 'utf8').toString('base64url');
            assert.throws(() => decodeCursor(encoded), /Invalid cursor: must decode to an object/);
        });
    });

    describe('buildKeysetCondition', function () {
        it('builds condition for created_at DESC, id DESC with after', function () {
            // ISO dates in cursor get normalized to database format in bindings
            const cursor = {created_at: '2025-01-15T10:30:00.000Z', id: '65a8f3abc123'};
            const order = [
                {field: 'created_at', direction: 'desc'},
                {field: 'id', direction: 'desc'}
            ];
            const result = buildKeysetCondition(cursor, order, 'after');

            assert.equal(result.sql, '(comments.created_at < ?) OR (comments.created_at = ? AND comments.id < ?)');
            assert.deepEqual(result.bindings, [
                '2025-01-15 10:30:00',
                '2025-01-15 10:30:00',
                '65a8f3abc123'
            ]);
        });

        it('builds condition for created_at ASC, id ASC with after', function () {
            const cursor = {created_at: '2025-01-15T10:30:00.000Z', id: '65a8f3abc123'};
            const order = [
                {field: 'created_at', direction: 'asc'},
                {field: 'id', direction: 'asc'}
            ];
            const result = buildKeysetCondition(cursor, order, 'after');

            assert.equal(result.sql, '(comments.created_at > ?) OR (comments.created_at = ? AND comments.id > ?)');
            assert.deepEqual(result.bindings, [
                '2025-01-15 10:30:00',
                '2025-01-15 10:30:00',
                '65a8f3abc123'
            ]);
        });

        it('builds condition for before direction (reverses operators)', function () {
            const cursor = {created_at: '2025-01-15T10:30:00.000Z', id: '65a8f3abc123'};
            const order = [
                {field: 'created_at', direction: 'desc'},
                {field: 'id', direction: 'desc'}
            ];
            const result = buildKeysetCondition(cursor, order, 'before');

            assert.equal(result.sql, '(comments.created_at > ?) OR (comments.created_at = ? AND comments.id > ?)');
            assert.deepEqual(result.bindings, [
                '2025-01-15 10:30:00',
                '2025-01-15 10:30:00',
                '65a8f3abc123'
            ]);
        });

        it('builds condition for "Best" sort with three fields', function () {
            const cursor = {count__likes: 42, created_at: '2025-01-15T10:30:00.000Z', id: '65a8f3abc123'};
            const order = [
                {field: 'count__likes', direction: 'desc'},
                {field: 'created_at', direction: 'desc'},
                {field: 'id', direction: 'desc'}
            ];
            const result = buildKeysetCondition(cursor, order, 'after');

            assert.equal(
                result.sql,
                '(count__likes < ?) OR (count__likes = ? AND comments.created_at < ?) OR (count__likes = ? AND comments.created_at = ? AND comments.id < ?)'
            );
            assert.deepEqual(result.bindings, [42, 42, '2025-01-15 10:30:00', 42, '2025-01-15 10:30:00', '65a8f3abc123']);
        });

        it('handles single field order', function () {
            const cursor = {id: '65a8f3abc123'};
            const order = [{field: 'id', direction: 'desc'}];
            const result = buildKeysetCondition(cursor, order, 'after');

            assert.equal(result.sql, '(comments.id < ?)');
            assert.deepEqual(result.bindings, ['65a8f3abc123']);
        });
    });

    describe('extractCursorValues', function () {
        it('extracts values for created_at and id', function () {
            const model = {
                get(key) {
                    const data = {created_at: new Date('2025-01-15T10:30:00.000Z'), id: '65a8f3abc123'};
                    return data[key];
                },
                attributes: {}
            };
            const order = [
                {field: 'created_at', direction: 'desc'},
                {field: 'id', direction: 'desc'}
            ];
            const result = extractCursorValues(model, order);
            assert.deepEqual(result, {
                created_at: '2025-01-15T10:30:00.000Z',
                id: '65a8f3abc123'
            });
        });

        it('extracts computed count__likes from attributes', function () {
            const model = {
                get(key) {
                    const data = {created_at: new Date('2025-01-15T10:30:00.000Z'), id: '65a8f3abc123'};
                    return data[key];
                },
                attributes: {
                    count__likes: 42
                }
            };
            const order = [
                {field: 'count__likes', direction: 'desc'},
                {field: 'created_at', direction: 'desc'},
                {field: 'id', direction: 'desc'}
            ];
            const result = extractCursorValues(model, order);
            assert.deepEqual(result, {
                count__likes: 42,
                created_at: '2025-01-15T10:30:00.000Z',
                id: '65a8f3abc123'
            });
        });

        it('handles string created_at values', function () {
            const model = {
                get(key) {
                    const data = {created_at: '2025-01-15T10:30:00.000Z', id: 'abc'};
                    return data[key];
                },
                attributes: {}
            };
            const order = [
                {field: 'created_at', direction: 'desc'},
                {field: 'id', direction: 'desc'}
            ];
            const result = extractCursorValues(model, order);
            assert.deepEqual(result, {
                created_at: '2025-01-15T10:30:00.000Z',
                id: 'abc'
            });
        });
    });
});
