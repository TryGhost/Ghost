import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import { CacheBase } from '../src/base.ts';
import { supportsEventLog, type EventLogCache } from '../src/event-log.ts';

class TestCache extends CacheBase {
  get() {
    return null;
  }

  set() {
    return null;
  }

  reset() {}

  keys() {
    return [];
  }
}

describe('adapter-base-cache', function () {
  it('should have requiredFns property', function () {
    const cache = new TestCache();
    assert.deepEqual(cache.requiredFns, ['get', 'set', 'reset', 'keys']);
    assert.ok(Object.isFrozen(cache.requiredFns), 'requiredFns should be frozen');
  });

  it('recognizes optional event support without requiring it on ordinary caches', function () {
    assert.equal(supportsEventLog(new TestCache()), false);
    const events = {
      appendEvent: () => 1,
      readEvents: () => [],
    } satisfies EventLogCache;
    assert.equal(supportsEventLog(events), true);
  });

  it.each([
    undefined,
    null,
    'cache',
    {},
    { appendEvent: true, readEvents: (): string[] => [] },
    { appendEvent: (): number => 1 },
    { appendEvent: (): number => 1, readEvents: true },
  ])('rejects incomplete event support: %j', function (cache) {
    assert.equal(supportsEventLog(cache), false);
  });
});
