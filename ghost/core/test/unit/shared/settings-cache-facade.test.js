const assert = require('node:assert/strict');
const settingsCache = require('../../../core/shared/settings-cache');
const {getRootContainer, setDefaultScope, resetContainer} = require('../../../core/shared/container/current');
const {registerCoreServices} = require('../../../core/registrations');
const MemoryCache = require('../../../core/server/adapters/cache/MemoryCache');
const createEventRegistry = require('../../../core/server/lib/common/create-event-registry');

describe('settings cache facade', function () {
    afterEach(function () {
        resetContainer();
    });

    it('delegates to the default scope when one is set', function () {
        const root = getRootContainer();
        registerCoreServices(root);
        const scope = root.createScope({siteConfig: {}});
        setDefaultScope(scope);

        const scopeCache = scope.resolve('settingsCache');
        scopeCache.init(createEventRegistry(), null, [], new MemoryCache(), {});
        scopeCache.set('title', {value: 'Scope Site'});

        assert.equal(settingsCache.get('title'), 'Scope Site');
    });
});
