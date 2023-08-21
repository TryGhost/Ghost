const assert = require('assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const RedisCache = require('../index');

describe('Adapter Cache Redis', function () {
    beforeEach(function () {
        sinon.stub(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('can initialize Redis cache instance directly', async function () {
        const redisCacheInstanceStub = {
            store: {
                getClient: sinon.stub().returns({
                    on: sinon.stub()
                })
            }
        };
        const cache = new RedisCache({
            cache: redisCacheInstanceStub
        });

        assert.ok(cache);
    });

    describe('get', function () {
        it('can get a value from the cache', async function () {
            const redisCacheInstanceStub = {
                get: sinon.stub().resolves('value from cache'),
                store: {
                    getClient: sinon.stub().returns({
                        on: sinon.stub()
                    })
                }
            };
            const cache = new RedisCache({
                cache: redisCacheInstanceStub
            });

            const value = await cache.get('key');

            assert.equal(value, 'value from cache');
        });
    });

    describe('set', function () {
        it('can set a value in the cache', async function () {
            const redisCacheInstanceStub = {
                set: sinon.stub().resolvesArg(1),
                store: {
                    getClient: sinon.stub().returns({
                        on: sinon.stub()
                    })
                }
            };
            const cache = new RedisCache({
                cache: redisCacheInstanceStub
            });

            const value = await cache.set('key-here', 'new value');

            assert.equal(value, 'new value');
            assert.equal(redisCacheInstanceStub.set.args[0][0], 'key-here');
        });

        it('sets a key based on keyPrefix', async function () {
            const redisCacheInstanceStub = {
                set: sinon.stub().resolvesArg(1),
                store: {
                    getClient: sinon.stub().returns({
                        on: sinon.stub()
                    })
                }
            };
            const cache = new RedisCache({
                cache: redisCacheInstanceStub,
                keyPrefix: 'testing-prefix:'
            });

            const value = await cache.set('key-here', 'new value');

            assert.equal(value, 'new value');
            assert.equal(redisCacheInstanceStub.set.args[0][0], 'testing-prefix:key-here');
        });
    });

    describe('reset', function () {
        it('catches an error when thrown during the reset', async function () {
            const redisCacheInstanceStub = {
                get: sinon.stub().resolves('value from cache'),
                store: {
                    getClient: sinon.stub().returns({
                        on: sinon.stub()
                    })
                }
            };
            const cache = new RedisCache({
                cache: redisCacheInstanceStub
            });

            await cache.reset();

            assert.ok(logging.error.calledOnce, 'error was logged');
        });
    });
});
