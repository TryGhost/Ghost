import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import MemoryCache from '../../../../../core/server/adapters/cache/MemoryCache';

describe('In Memory Cache Adapter', function () {
  let memoryCache = new MemoryCache();

  beforeEach(function () {
    memoryCache = new MemoryCache();
  });

  it('stores a value through set method', function () {
    memoryCache.set('a', 'Alabama');

    assert.deepEqual(['a'], memoryCache.keys());
    assert.equal('Alabama', memoryCache.get('a'));
  });

  it('flushes the storage', function () {
    memoryCache.set('t', 'Texas');

    assert.equal('Texas', memoryCache.get('t'));

    memoryCache.reset();

    assert.deepEqual([], memoryCache.keys());
    assert.equal(undefined, memoryCache.get('t'));
  });
});

describe('In Memory Cache Adapter with clone', function () {
  it('does not copy by default, so a caller shares the stored object', function () {
    const cache = new MemoryCache();
    cache.set('post', { title: 'Original', meta: { show: true } });

    // What the frontend does to the resource it is handed.
    const first = cache.get('post') as { title: string; meta?: { show?: boolean } };
    delete first.meta!.show;

    assert.equal((cache.get('post') as { meta: { show?: boolean } }).meta.show, undefined);
  });

  it('hands out a private copy on every read when clone is on', function () {
    const cache = new MemoryCache({ clone: true });
    cache.set('post', { title: 'Original', meta: { show: true } });

    const first = cache.get('post') as { title: string; meta: { show?: boolean } };
    delete first.meta.show;
    first.title = 'Mutated';

    const second = cache.get('post') as { title: string; meta: { show?: boolean } };
    assert.equal(second.meta.show, true);
    assert.equal(second.title, 'Original');
  });

  it('copies on write, so mutating the original after set cannot corrupt it', function () {
    const cache = new MemoryCache({ clone: true });
    // The pipeline caches the response and then returns that same object to a
    // caller which mutates it, so the copy has to happen on the way in too.
    const response: { title: string; meta: { show?: boolean } } = {
      title: 'Original',
      meta: { show: true },
    };
    cache.set('post', response);
    delete response.meta.show;

    assert.equal((cache.get('post') as { meta: { show?: boolean } }).meta.show, true);
  });

  it('declines to cache a value it cannot copy', function () {
    const cache = new MemoryCache({ clone: true });
    // JSON.stringify drops a function silently, so this caches fine on Redis;
    // here it must be a miss rather than a throw.
    assert.doesNotThrow(() => cache.set('fn', { render: () => 'nope' }));
    assert.equal(cache.get('fn'), undefined);
  });

  it('round-trips the values an API response is made of', function () {
    const cache = new MemoryCache({ clone: true });
    const response = {
      posts: [{ id: 'a', title: 'T', html: '<p>x</p>', tags: [{ slug: 's' }], featured: false }],
      meta: { pagination: { page: 1, next: null } },
    };

    cache.set('k', response);
    assert.deepEqual(cache.get('k'), response);
  });
});
