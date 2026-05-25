import assert from 'node:assert/strict';

import type {RedirectsStore} from '../../../../../../core/server/services/custom-redirects/types';

interface ContractOptions {
    createStore: () => RedirectsStore | Promise<RedirectsStore>;
}

export function runStoreContract({createStore}: ContractOptions): void {
    describe('RedirectsStore contract', function () {
        let store: RedirectsStore;

        beforeEach(async function () {
            store = await createStore();
        });

        describe('getAll', function () {
            it('returns an empty array when no redirects have been stored', async function () {
                const result = await store.getAll();

                assert.deepEqual(result, []);
            });

            it('returns data that callers cannot mutate in place', async function () {
                await store.replaceAll([{from: '/a', to: '/b', permanent: true}]);

                const firstRead = await store.getAll();
                firstRead.push({from: '/x', to: '/y', permanent: false});
                firstRead[0].to = '/mutated';

                assert.deepEqual(await store.getAll(), [
                    {from: '/a', to: '/b', permanent: true}
                ]);
            });
        });

        describe('replaceAll', function () {
            it('persists redirects so getAll returns the same RedirectConfig[]', async function () {
                const redirects = [
                    {from: '/old/', to: '/new/', permanent: true},
                    {from: '^/post/[0-9]+/(.+)$', to: '/$1', permanent: false}
                ];

                await store.replaceAll(redirects);

                assert.deepEqual(await store.getAll(), redirects);
            });

            it('overwrites previously stored redirects rather than appending', async function () {
                await store.replaceAll([{from: '/a', to: '/b', permanent: true}]);
                await store.replaceAll([{from: '/c', to: '/d', permanent: false}]);

                assert.deepEqual(await store.getAll(), [
                    {from: '/c', to: '/d', permanent: false}
                ]);
            });

            it('clears all redirects when called with an empty array', async function () {
                await store.replaceAll([{from: '/a', to: '/b', permanent: true}]);
                await store.replaceAll([]);

                assert.deepEqual(await store.getAll(), []);
            });

            it('does not retain a reference to the input array (caller mutations do not leak)', async function () {
                const redirects = [{from: '/a', to: '/b', permanent: true}];

                await store.replaceAll(redirects);
                redirects.push({from: '/c', to: '/d', permanent: false});
                redirects[0].to = '/mutated';

                assert.deepEqual(await store.getAll(), [
                    {from: '/a', to: '/b', permanent: true}
                ]);
            });
        });
    });
}
