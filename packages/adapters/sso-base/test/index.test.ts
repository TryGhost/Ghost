import assert from 'node:assert/strict';
import {describe, it} from 'vitest';

import {SSOBase, type User} from '../src/base.ts';

class TestSSO extends SSOBase<null, null> {
    async getRequestCredentials() {
        return null;
    }

    async getIdentityFromCredentials() {
        return null;
    }

    async getUserForIdentity() {
        return null;
    }

    // Expose the protected helpers so the injection surface can be tested from
    // the same vantage point an adapter implementation would use them.
    lookupByEmail(email: string) {
        return this.getUserByEmail(email);
    }

    lookupOwner() {
        return this.getOwnerUser();
    }
}

describe('adapter-base-sso', function () {
    it('should have requiredFns property', function () {
        const store = new TestSSO();
        assert.deepEqual(store.requiredFns, ['getRequestCredentials', 'getIdentityFromCredentials', 'getUserForIdentity']);
        assert.ok(Object.isFrozen(store.requiredFns), 'requiredFns should be frozen');
    });

    describe('user repository', function () {
        it('resolves users by email through the injected repository', async function () {
            const owner: User = {id: 'owner-id', email: 'owner@example.com'};
            const jane: User = {id: 'jane-id', email: 'jane@example.com'};

            const store = new TestSSO();
            store.setUserRepository({
                async getByEmail(email) {
                    return email === jane.email ? jane : null;
                },
                async getOwner() {
                    return owner;
                }
            });

            assert.deepEqual(await store.lookupByEmail('jane@example.com'), jane);
            assert.equal(await store.lookupByEmail('nobody@example.com'), null);
            assert.deepEqual(await store.lookupOwner(), owner);
        });

        it('throws when the repository is used before being configured', async function () {
            const store = new TestSSO();
            await assert.rejects(
                () => store.lookupByEmail('jane@example.com'),
                /no user repository configured/
            );
            await assert.rejects(
                () => store.lookupOwner(),
                /no user repository configured/
            );
        });
    });
});
