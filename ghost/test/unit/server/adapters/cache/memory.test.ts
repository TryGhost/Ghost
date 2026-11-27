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
