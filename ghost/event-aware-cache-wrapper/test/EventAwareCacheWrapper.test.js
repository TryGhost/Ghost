const assert = require('assert/strict');
const InMemoryCache = require('@tryghost/adapter-cache-memory-ttl');

const EventAwareCacheWrapper = require('../index');
const {EventEmitter} = require('stream');

describe('EventAwareCacheWrapper', function () {
    it('Can initialize', function () {
        const cache = new InMemoryCache();
        const logging = {
            info: () => {}
        };
        const wrappedCache = new EventAwareCacheWrapper({
            cache,
            logging
        });
        assert.ok(wrappedCache);
    });

    describe('get', function () {
        it('calls a wrapped cache with extra key', async function () {
            const cache = new InMemoryCache();
            const logging = {
                info: () => {}
            };
            const wrapper = new EventAwareCacheWrapper({
                cache,
                logging
            });

            await wrapper.set('a', 'b');
            assert.equal(await wrapper.get('a'), 'b');
            assert.equal(await cache.get('a'), 'b');
        });
    });

    describe('listens to reset events', function () {
        it('resets the cache when reset event is triggered', async function () {
            const cache = new InMemoryCache();
            const logging = {
                info: () => {}
            };
            const eventRegistry = new EventEmitter();
            const wrapper = new EventAwareCacheWrapper({
                cache,
                logging,
                resetEvents: ['site.changed'],
                eventRegistry: eventRegistry
            });

            await wrapper.set('a', 'b');
            assert.equal(await wrapper.get('a'), 'b');

            eventRegistry.emit('site.changed');

            assert.equal(await wrapper.get('a'), undefined);
        });
    });
});
