require('should');

const {Cache} = require('../');

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

            getAll.should.have.size(2);
            getAll.should.deepEqual({
                one: 1,
                two: 2
            });

            cache.get('one').should.equal(1);
            cache.get('two').should.equal(2);
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

            getAll.should.have.size(1);
            getAll.should.not.have.keys('one', 'two');
            getAll.should.deepEqual({
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

            should(returned).equal(undefined);
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

            cache.get('one').should.equal(1);
            cache.get('two').should.equal(2);
        });

        it('returns undefined for unknown value', function () {
            const cache = new Cache();
            const settings = [
                {key: 'one', value: 1},
                {key: 'two', value: 2}
            ];

            cache.populate(settings);

            should(cache.get('unknown')).equal(undefined);
        });

        it('returns undefined when cache is empty', function () {
            const cache = new Cache();

            should(cache.get('unknown')).equal(undefined);
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

            returned.should.have.size(2);
            returned.should.deepEqual({
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

            should.not.exist(cache.get('new'));
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

            cache.getAll().should.deepEqual({});
            should.not.exist(cache.get('one'));
        });
    });
});
