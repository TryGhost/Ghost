import assert from 'node:assert/strict';
import {describe, it} from 'vitest';

import {CacheBase} from '../src/base.ts';

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
});
