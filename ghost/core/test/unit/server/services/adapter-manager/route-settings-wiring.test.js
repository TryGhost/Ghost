const assert = require('node:assert/strict');
const {RouteSettingsStoreBase} = require('@tryghost/adapter-base-route-settings');

const adapterManager = require('../../../../../core/server/services/adapter-manager');
const getAdapterServiceConfig = require('../../../../../core/server/services/adapter-manager/config');
const config = require('../../../../../core/shared/config');
const configUtils = require('../../../../utils/config-utils');

describe('UNIT: adapter-manager route-settings wiring', function () {
    afterEach(async function () {
        await configUtils.restore();
        adapterManager.clearCache();
    });

    it('returns a FileStore instance extending RouteSettingsStoreBase by default', function () {
        const store = adapterManager.getAdapter('route-settings');

        assert.ok(store instanceof RouteSettingsStoreBase);
        assert.equal(store.constructor.name, 'FileStore');
        assert.deepEqual([...store.requiredFns], ['get', 'replace']);
    });

    it('resolves FileStore paths from Ghost config when not explicitly set', function () {
        const adapterServiceConfig = getAdapterServiceConfig(config);

        assert.equal(adapterServiceConfig['route-settings'].FileStore.basePath, config.getContentPath('settings'));
        assert.equal(adapterServiceConfig['route-settings'].FileStore.defaultSettingsBasePath, config.get('paths').defaultRouteSettings);
    });

    it('keeps explicitly configured FileStore paths', function () {
        configUtils.set('adapters:route-settings:FileStore:basePath', '/custom/settings');

        const adapterServiceConfig = getAdapterServiceConfig(config);

        assert.equal(adapterServiceConfig['route-settings'].FileStore.basePath, '/custom/settings');
    });

    it('re-resolves FileStore paths when the content path changes', function () {
        const before = getAdapterServiceConfig(config);

        configUtils.set('paths:contentPath', '/elsewhere/');

        const after = getAdapterServiceConfig(config);

        assert.equal(after['route-settings'].FileStore.basePath, config.getContentPath('settings'));
        assert.notEqual(after['route-settings'].FileStore.basePath, before['route-settings'].FileStore.basePath);
    });

    it('reads the bundled default route settings end-to-end', async function () {
        const store = adapterManager.getAdapter('route-settings');

        const settings = await store.get();

        assert.deepEqual(settings.routes, []);
        assert.deepEqual(settings.collections, [{path: '/', permalink: '/{slug}/', templates: ['index']}]);
        assert.deepEqual(settings.taxonomies, {tag: '/tag/{slug}/', author: '/author/{slug}/'});
    });

    it('rejects an unknown active adapter with a clear error', function () {
        configUtils.set('adapters:route-settings:active', 'MissingStore');
        adapterManager.clearCache();

        assert.throws(() => {
            adapterManager.getAdapter('route-settings');
        }, (err) => {
            assert.equal(err.errorType, 'IncorrectUsageError');
            assert.match(err.message, /Unable to find route-settings adapter MissingStore/);
            return true;
        });
    });
});
