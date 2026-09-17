const assert = require('node:assert/strict');
const MemoryTTLCache = require('../../../../../core/server/adapters/cache/AdapterCacheMemoryTTL');

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe('Cache Adapter In Memory with Time To Live', function () {
  it('Can initialize a cache instance', function () {
    const cache = new MemoryTTLCache();
    assert.ok(cache);
  });

  describe('get', function () {
    it('Can get a value from the cache', async function () {
      const cache = new MemoryTTLCache({});
      cache.set('a', 'b');
      assert.equal(cache.get('a'), 'b', 'should get the value from the cache');

      await sleep(100);

      assert.equal(cache.get('a'), 'b', 'should get the value from the cache after some time');
    });
  });

  describe('reset', function () {
    it('Can reset the cache', async function () {
      const cache = new MemoryTTLCache({ ttl: 150 });

      cache.set('a', 'b');
      cache.set('c', 'd');

      assert.equal(cache.get('a'), 'b', 'should get the value from the cache');
      assert.equal(cache.get('c'), 'd', 'should get the value from the cache');

      cache.reset();

      assert.equal(
        cache.get('a'),
        undefined,
        'should NOT get the value from the cache after reset',
      );
      assert.equal(
        cache.get('c'),
        undefined,
        'should NOT get the value from the cache after reset',
      );
    });
  });

  describe('keys', function () {
    it('Can get all keys from the cache', async function () {
      const cache = new MemoryTTLCache({ ttl: 200 });

      cache.set('a', 'b');
      cache.set('c', 'd');

      assert.deepEqual(cache.keys(), ['a', 'c'], 'should get all keys from the cache');
    });
  });
});

describe('Cache Adapter In Memory with Time To Live - clone', function () {
  it('shares the stored object by default', function () {
    const cache = new MemoryTTLCache();
    cache.set('post', { meta: { show: true } });

    delete cache.get('post').meta.show;

    assert.equal(cache.get('post').meta.show, undefined);
  });

  it('hands out a private copy on every read when clone is on', function () {
    const cache = new MemoryTTLCache({ clone: true });
    cache.set('post', { meta: { show: true } });

    delete cache.get('post').meta.show;

    assert.equal(cache.get('post').meta.show, true);
  });

  it('copies on write too', function () {
    const cache = new MemoryTTLCache({ clone: true });
    const response = { meta: { show: true } };

    cache.set('post', response);
    delete response.meta.show;

    assert.equal(cache.get('post').meta.show, true);
  });

  it('declines to cache a value it cannot copy', function () {
    const cache = new MemoryTTLCache({ clone: true });

    assert.doesNotThrow(() => cache.set('fn', { render: () => 'nope' }));
    assert.equal(cache.get('fn'), undefined);
    assert.deepEqual(cache.keys(), []);
  });

  it('still honours max and ttl', async function () {
    const cache = new MemoryTTLCache({ clone: true, max: 1, ttl: 20 });

    cache.set('a', { v: 1 });
    cache.set('b', { v: 2 });
    assert.deepEqual(cache.keys(), ['b']);

    await sleep(40);
    assert.equal(cache.get('b'), undefined);
  });
});
