const assert = require('node:assert/strict');
const {normalizeDateFilters} = require('../../../../../core/server/models/base/plugins/date-filter');

describe('Models: date-filter', function () {
    describe('normalizeDateFilters', function () {
        it('normalizes an ISO date with a timezone offset on a date column to UTC db format', function () {
            const result = normalizeDateFilters({
                published_at: {$gt: '2025-02-27T19:03:00.000-05:00'}
            });

            assert.deepEqual(result, {
                published_at: {$gt: '2025-02-28 00:03:00'}
            });
        });

        it('normalizes a Zulu ISO date on a date column', function () {
            const result = normalizeDateFilters({
                published_at: {$lt: '2025-02-27T19:03:00Z'}
            });

            assert.deepEqual(result, {
                published_at: {$lt: '2025-02-27 19:03:00'}
            });
        });

        it('normalizes an equality value on a date column', function () {
            const result = normalizeDateFilters({
                created_at: '2025-02-27T19:03:00.000Z'
            });

            assert.deepEqual(result, {
                created_at: '2025-02-27 19:03:00'
            });
        });

        it('leaves values already in db format untouched', function () {
            const filter = {published_at: {$gt: '2025-02-27 19:03:00'}};

            assert.deepEqual(normalizeDateFilters(filter), {
                published_at: {$gt: '2025-02-27 19:03:00'}
            });
        });

        it('does not touch non-date columns even when the value looks like a date', function () {
            const filter = {slug: '2025-02-27', title: {$ne: '2025-02-27T19:03:00Z'}};

            assert.deepEqual(normalizeDateFilters(filter), filter);
        });

        it('leaves unparseable values on a date column untouched', function () {
            const filter = {published_at: {$gt: 'not-a-date'}};

            assert.deepEqual(normalizeDateFilters(filter), filter);
        });

        it('leaves a non-plain object value (e.g. a Date) on a date column untouched', function () {
            const date = new Date('2025-02-27T19:03:00Z');
            const result = normalizeDateFilters({published_at: date});

            assert.equal(result.published_at, date);
        });

        it('normalizes arrays of values ($in)', function () {
            const result = normalizeDateFilters({
                published_at: {$in: ['2025-02-27T19:03:00Z', '2025-03-01T00:00:00Z']}
            });

            assert.deepEqual(result, {
                published_at: {$in: ['2025-02-27 19:03:00', '2025-03-01 00:00:00']}
            });
        });

        it('recurses into $and / $or groups', function () {
            const result = normalizeDateFilters({
                $and: [
                    {published_at: {$gt: '2025-02-27T19:03:00Z'}},
                    {$or: [
                        {featured: true},
                        {updated_at: {$lt: '2025-03-01T00:00:00Z'}}
                    ]}
                ]
            });

            assert.deepEqual(result, {
                $and: [
                    {published_at: {$gt: '2025-02-27 19:03:00'}},
                    {$or: [
                        {featured: true},
                        {updated_at: {$lt: '2025-03-01 00:00:00'}}
                    ]}
                ]
            });
        });

        it('resolves relation-qualified date columns by column name', function () {
            const result = normalizeDateFilters({
                'posts.published_at': {$gt: '2025-02-27T19:03:00Z'}
            });

            assert.deepEqual(result, {
                'posts.published_at': {$gt: '2025-02-27 19:03:00'}
            });
        });

        it('returns primitive nodes unchanged', function () {
            assert.equal(normalizeDateFilters(null), null);
            assert.equal(normalizeDateFilters('string'), 'string');
        });
    });
});
