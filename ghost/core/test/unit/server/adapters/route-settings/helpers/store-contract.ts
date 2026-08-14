import assert from 'node:assert/strict';

import type {RouteSettings, RouteSettingsStore} from '@tryghost/adapter-base-route-settings';

import {buildRouteSettings} from '../../../services/route-settings/route-settings-fixture';

interface ContractOptions {
    createStore: () => RouteSettingsStore | Promise<RouteSettingsStore>;
}

const emptySettings = (): RouteSettings => buildRouteSettings({routes: [], collections: [], taxonomies: {}});

const sampleSettings = (): RouteSettings => buildRouteSettings({
    routes: [
        {type: 'template', path: '/about/', templates: ['about']}
    ],
    collections: [
        {
            path: '/',
            permalink: '/{slug}/',
            templates: ['index'],
            data: {featured: {resource: 'posts', type: 'browse', filter: 'featured:true'}}
        }
    ],
    taxonomies: {
        tag: '/tag/{slug}/'
    }
});

export function runStoreContract({createStore}: ContractOptions): void {
    describe('RouteSettingsStore contract', function () {
        let store: RouteSettingsStore;

        beforeEach(async function () {
            store = await createStore();
        });

        describe('get', function () {
            it('returns settings that callers cannot mutate in place', async function () {
                await store.replace(sampleSettings());

                const firstRead = await store.get();
                firstRead.routes.push({type: 'template', path: '/x/', templates: ['x']});
                firstRead.collections[0].permalink = '/mutated/';

                assert.deepEqual(await store.get(), sampleSettings());
            });
        });

        describe('replace', function () {
            it('persists settings so get returns the same RouteSettings', async function () {
                const settings = sampleSettings();

                await store.replace(settings);

                assert.deepEqual(await store.get(), settings);
            });

            it('persists yamlSource verbatim', async function () {
                const settings = sampleSettings();

                await store.replace(settings);

                assert.equal((await store.get()).yamlSource, settings.yamlSource);
            });

            it('overwrites previously stored settings rather than merging', async function () {
                await store.replace(sampleSettings());
                await store.replace(buildRouteSettings({
                    routes: [],
                    collections: [{path: '/blog/', permalink: '/blog/{slug}/', templates: ['index']}],
                    taxonomies: {}
                }));

                assert.deepEqual(await store.get(), buildRouteSettings({
                    routes: [],
                    collections: [{path: '/blog/', permalink: '/blog/{slug}/', templates: ['index']}],
                    taxonomies: {}
                }));
            });

            it('clears all settings when called with empty settings', async function () {
                await store.replace(sampleSettings());
                await store.replace(emptySettings());

                assert.deepEqual(await store.get(), emptySettings());
            });

            it('does not retain a reference to the input (caller mutations do not leak)', async function () {
                const settings = sampleSettings();

                await store.replace(settings);
                settings.routes.push({type: 'template', path: '/x/', templates: ['x']});
                settings.taxonomies.tag = '/mutated/';

                assert.deepEqual(await store.get(), sampleSettings());
            });
        });
    });
}
