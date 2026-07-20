import assert from 'node:assert/strict';
import type {RouteSettings} from '@tryghost/adapter-base-route-settings';

// the adapter-manager is required via its `.default` export (so its methods stay
// stubbable) and config-utils is untyped JS, so neither can be imported.
// RouteSettingsStoreBase is required rather than imported so that we compare
// against the same class the adapter loader resolves - it loads adapters with
// `require`, which reads the package's compiled build, whereas an ESM import
// here resolves to the package source and would fail the `instanceof` check.
const {RouteSettingsStoreBase} = require('@tryghost/adapter-base-route-settings');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
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

    it('reads the bundled default route settings end-to-end', async function () {
        const store = adapterManager.getAdapter('route-settings');

        const settings: RouteSettings = await store.get();

        assert.deepEqual(settings.routes, []);
        assert.deepEqual(settings.collections, [{path: '/', permalink: '/{slug}/', templates: ['index']}]);
        assert.deepEqual(settings.taxonomies, {tag: '/tag/{slug}/', author: '/author/{slug}/'});
    });

    it('rejects an unknown active adapter with a clear error', function () {
        configUtils.set('adapters:route-settings:active', 'MissingStore');
        adapterManager.clearCache();

        assert.throws(() => {
            adapterManager.getAdapter('route-settings');
        }, (err: Error & {errorType?: string}) => {
            assert.equal(err.errorType, 'IncorrectUsageError');
            assert.match(err.message, /Unable to find route-settings adapter MissingStore/);
            return true;
        });
    });
});
