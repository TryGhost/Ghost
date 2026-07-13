import assert from 'node:assert/strict';
import {describe, it} from 'vitest';

import {SSOBase} from '../src/base.ts';

describe('adapter-base-redirects', function () {
    it('should have requiredFns property', function () {
        class TestSSO extends SSOBase<null, null> {
            async getRequestCredentials() {
                return null
            }

            async getIdentityFromCredentials() {
                return null
            }

            async getUserForIdentity() {
                return null
            }
        }

        const store = new TestSSO();
        assert.deepEqual(store.requiredFns, ['getRequestCredentials', 'getIdentityFromCredentials', 'getUserForIdentity']);
        assert.ok(Object.isFrozen(store.requiredFns), 'requiredFns should be frozen');
    })
});
