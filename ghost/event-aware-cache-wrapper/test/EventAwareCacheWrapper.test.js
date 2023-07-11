const assert = require('assert/strict');
const InMemoryCache = require('@tryghost/adapter-cache-memory-ttl');

const EventAwareCacheWrapper = require('../index');
const {EventEmitter} = require('stream');

const sleep = ms => (
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    })
);

describe('EventAwareCacheWrapper', function () {
    it('Can initialize', function () {
        const cache = new InMemoryCache();
        const wrappedCache = new EventAwareCacheWrapper({
            cache
        });
        assert.ok(wrappedCache);
    });

    describe('get', function () {
        it('calls a wrapped cache with extra key', async function () {
            const cache = new InMemoryCache();
            const lastReset = Date.now();
            const wrapper = new EventAwareCacheWrapper({
                cache: cache,
                lastReset: lastReset
            });

            await wrapper.set('a', 'b');
            assert.equal(await wrapper.get('a'), 'b');
            assert.equal(await cache.get(`${lastReset}:a`), 'b');
        });
    });

    describe('listens to reset events', function () {
        it('resets the cache when reset event is triggered', async function () {
            const cache = new InMemoryCache();
            const lastReset = Date.now();
            const eventRegistry = new EventEmitter();
            const wrapper = new EventAwareCacheWrapper({
                cache: cache,
                lastReset: lastReset,
                resetEvents: ['site.changed'],
                eventRegistry: eventRegistry
            });

            await wrapper.set('a', 'b');
            assert.equal(await wrapper.get('a'), 'b');

            // let the time tick to get new lastReset
            await sleep(100);

            eventRegistry.emit('site.changed');

            assert.equal(await wrapper.get('a'), undefined);
        });
    });
});
