import assert from 'node:assert/strict';
import {describe, it} from 'vitest';

import {RedirectsStoreBase, type RedirectConfig} from '../src/base.ts';

describe('adapter-base-redirects', function () {
    it('should have requiredFns property', function () {
        class TestStore extends RedirectsStoreBase {
            async getAll() {
                return [];
            }
            async replaceAll(_: RedirectConfig[]) {
                return;
            }
        }

        const store = new TestStore();
        assert.deepEqual(store.requiredFns, ['getAll', 'replaceAll']);
    })
});
