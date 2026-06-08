const assert = require('node:assert/strict');

const Cache = require('../../../../core/shared/custom-theme-settings-cache/custom-theme-settings-cache');

describe('Cache', function () {
    describe('populate()', function () {
        it('fills cache from settings-like array', function () {
            const cache = new Cache();
            const settings = [
                {key: 'one', value: 1},
                {key: 'two', value: 2}
            ];

            cache.populate(settings);

            const getAll = cache.getAll();

            assert.deepEqual(getAll, {
                one: 1,
                two: 2
            });

            assert.equal(cache.get('one'), 1);
            assert.equal(cache.get('two'), 2);
        });

        it('clears cache before filling', function () {
            const cache = new Cache();
            const settings1 = [
                {key: 'one', value: 1},
                {key: 'two', value: 2}
            ];

            cache.populate(settings1);

            const settings2 = [
                {key: 'three', value: 3}
            ];

            cache.populate(settings2);

            const getAll = cache.getAll();

            assert.deepEqual(getAll, {
                three: 3
            });
        });

        it('returns undefined', function () {
            const cache = new Cache();
            const settings1 = [
                {key: 'one', value: 1},
                {key: 'two', value: 2}
            ];

            const returned = cache.populate(settings1);

            assert.equal(returned, undefined);
        });
    });

    describe('get()', function () {
        it('returns correct value', function () {
            const cache = new Cache();
            const settings = [
                {key: 'one', value: 1},
                {key: 'two', value: 2}
            ];

            cache.populate(settings);

            assert.equal(cache.get('one'), 1);
            assert.equal(cache.get('two'), 2);
        });

        it('returns undefined for unknown value', function () {
            const cache = new Cache();
            const settings = [
                {key: 'one', value: 1},
                {key: 'two', value: 2}
            ];

            cache.populate(settings);

            assert.equal(cache.get('unknown'), undefined);
        });

        it('returns undefined when cache is empty', function () {
            const cache = new Cache();

            assert.equal(cache.get('unknown'), undefined);
        });
    });

    describe('getAll()', function () {
        it('returns object with all keys', function () {
            const cache = new Cache();
            const settings = [
                {key: 'one', value: 1},
                {key: 'two', value: 2}
            ];

            cache.populate(settings);

            const returned = cache.getAll();

            assert.deepEqual(returned, {
                one: 1,
                two: 2
            });
        });

        it('returns a shallow copy', function () {
            const cache = new Cache();
            const settings = [
                {key: 'one', value: 1},
                {key: 'two', value: 2}
            ];

            cache.populate(settings);

            const returned = cache.getAll();

            returned.new = 'exists';

            assert.equal(cache.get('new'), undefined);
        });
    });

    describe('clear()', function () {
        it('clears cache', function () {
            const cache = new Cache();
            const settings = [
                {key: 'one', value: 1},
                {key: 'two', value: 2}
            ];

            cache.populate(settings);

            cache.clear();

            assert.deepEqual(cache.getAll(), {});
            assert.equal(cache.get('one'), undefined);
        });
    });
});
