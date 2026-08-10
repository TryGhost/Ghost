import assert from 'node:assert/strict';
import fs from 'fs-extra';
import type LocalStorageBaseClass from '../../../../../core/server/adapters/storage/LocalStorageBase';
import type adapterManagerInstance from '../../../../../core/server/services/adapter-manager';

// Vitest resolves `import` through Vite's SSR module runner and `require`
// through Node's CJS cache, so the same first-party module loaded both ways
// yields two instances. The adapter manager loads adapters with `require`, so
// the base classes it compares them against have to come from that same graph —
// an imported StorageBase/LocalStorageBase would fail every `instanceof` check.
const {StorageBase} = require('ghost-storage-base');
const adapterManager: typeof adapterManagerInstance = require('../../../../../core/server/services/adapter-manager').default;
const LocalStorageBase: typeof LocalStorageBaseClass = require('../../../../../core/server/adapters/storage/LocalStorageBase').default;
const configUtils = require('../../../../utils/config-utils');
const {assertExists} = require('../../../../utils/assertions');

const storagePath = configUtils.config.getContentPath('adapters') + 'storage/';
describe('storage: index_spec', function () {
    const scope: {adapter: string | null} = {adapter: null};

    beforeAll(function () {
        if (!fs.existsSync(storagePath)) {
            fs.mkdirSync(storagePath);
        }
    });

    afterEach(async function () {
        if (scope.adapter) {
            fs.unlinkSync(scope.adapter);
            scope.adapter = null;
        }

        await configUtils.restore();
        adapterManager.clearCache();
    });

    it('default image storage is local file storage', function () {
        const chosenStorage = adapterManager.getAdapter('storage:images');
        assert.equal((chosenStorage instanceof StorageBase), true);
        assert.equal((chosenStorage instanceof LocalStorageBase), true);
    });

    it('custom adapter', function () {
        scope.adapter = storagePath + 'custom-adapter.js';

        configUtils.set({
            storage: {
                active: 'custom-adapter'
            }
        });

        const jsFile = '' +
            '\'use strict\';' +
            'var {StorageBase} = require(\'ghost-storage-base\');' +
            'class AnotherAdapter extends StorageBase {' +
            'exists(){}' +
            'save(){}' +
            'serve(){}' +
            'delete(){}' +
            'read(){}' +
            '}' +
            'module.exports = AnotherAdapter';

        let chosenStorage;

        fs.writeFileSync(scope.adapter, jsFile);

        assert.equal(configUtils.config.get('storage:active'), 'custom-adapter');
        chosenStorage = adapterManager.getAdapter('storage:images');
        assert.equal((chosenStorage instanceof LocalStorageBase), false);
        assert.equal((chosenStorage instanceof StorageBase), true);
    });

    it('create bad adapter: exists fn is missing', function () {
        scope.adapter = storagePath + 'broken-storage.js';

        configUtils.set({
            storage: {
                active: 'broken-storage'
            }
        });
        configUtils.set('paths:storage', __dirname + '/broken-storage.js');

        const jsFile = '' +
            '\'use strict\';' +
            'var {StorageBase} = require(\'ghost-storage-base\');' +
            'class AnotherAdapter extends StorageBase {' +
            'save(){}' +
            'serve(){}' +
            'delete(){}' +
            'read(){}' +
            '}' +
            'module.exports = AnotherAdapter';

        fs.writeFileSync(scope.adapter, jsFile);

        try {
            adapterManager.getAdapter('storage:images');
        } catch (err) {
            assertExists(err);
            assert.equal((err as {errorType?: string}).errorType, 'IncorrectUsageError');
        }
    });
});
