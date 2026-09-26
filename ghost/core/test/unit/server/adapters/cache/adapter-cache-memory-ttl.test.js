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

      // Order is recency, not insertion: lru-cache iterates most-recently-used
      // first. No caller depends on the order, so this asserts the set.
      assert.deepEqual(cache.keys().sort(), ['a', 'c'], 'should get all keys from the cache');
    });
  });
});

describe('Cache Adapter In Memory with Time To Live - bounds', function () {
  it('keeps the recently used entry and evicts the cold one', function () {
    // The reason for lru-cache over @isaacs/ttlcache, which purges
    // soonest-to-expire first and so, under one shared TTL, oldest-inserted -
    // dropping the hot entries a cache exists to keep.
    const cache = new MemoryTTLCache({ max: 2 });

    cache.set('hot', 1);
    cache.set('cold', 2);
    cache.get('hot');
    cache.set('new', 3);

    assert.equal(cache.get('hot'), 1, 'the recently read entry should survive');
    assert.equal(cache.get('cold'), undefined, 'the untouched entry should be evicted');
  });

  it('bounds by approximate size when maxSize is set', function () {
    const entry = { blob: 'x'.repeat(5000) };
    const cache = new MemoryTTLCache({ maxSize: 25000 });

    cache.set('a', entry);
    cache.set('b', entry);
    cache.set('c', entry);

    assert.ok(cache.keys().length >= 1, 'should still hold something');
    assert.ok(cache.keys().length < 3, 'should have evicted to stay within maxSize');
  });

  it('is bounded even when nothing is configured', function () {
    // The old default was no bound at all, which for a per-member response
    // cache is a leak rather than a cache. Asserted by filling past the
    // default rather than by trusting the constant: an unbounded cache would
    // keep all 10,001.
    const cache = new MemoryTTLCache();

    for (let i = 0; i < 10001; i += 1) {
      cache.set(`k${i}`, i);
    }

    assert.equal(cache.keys().length, 10000, 'should evict down to the default bound');
    assert.equal(cache.get('k0'), undefined, 'the oldest entry should be gone');
    assert.equal(cache.get('k10000'), 10000, 'the newest entry should be held');
  });

  it('still applies a per-call ttl', async function () {
    const cache = new MemoryTTLCache({ ttl: 60000 });

    cache.set('a', 1, { ttl: 30 });
    await sleep(60);

    assert.equal(cache.get('a'), undefined);
  });
});
