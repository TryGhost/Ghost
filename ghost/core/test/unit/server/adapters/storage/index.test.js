const should = require('should');
const fs = require('fs-extra');
const StorageBase = require('ghost-storage-base');
const configUtils = require('../../../../utils/configUtils');
const storage = require('../../../../../core/server/adapters/storage');
const LocalStorageBase = require('../../../../../core/server/adapters/storage/LocalStorageBase');

const storagePath = configUtils.config.getContentPath('adapters') + 'storage/';
describe('storage: index_spec', function () {
    const scope = {adapter: null};

    before(function () {
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
    });

    it('default image storage is local file storage', function () {
        const chosenStorage = storage.getStorage();
        (chosenStorage instanceof StorageBase).should.eql(true);
        (chosenStorage instanceof LocalStorageBase).should.eql(true);
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
            'var StorageBase = require(\'ghost-storage-base\');' +
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

        configUtils.config.get('storage:active').should.eql('custom-adapter');
        chosenStorage = storage.getStorage();
        (chosenStorage instanceof LocalStorageBase).should.eql(false);
        (chosenStorage instanceof StorageBase).should.eql(true);
    });

    it('create bad adapter: exists fn is missing', function () {
        scope.adapter = storagePath + 'broken-storage.js';

        configUtils.set({
            storage: {
                active: 'broken-storage'
            },
            paths: {
                storage: __dirname + '/broken-storage.js'
            }
        });

        const jsFile = '' +
            '\'use strict\';' +
            'var StorageBase = require(\'ghost-storage-base\');' +
            'class AnotherAdapter extends StorageBase {' +
            'save(){}' +
            'serve(){}' +
            'delete(){}' +
            'read(){}' +
            '}' +
            'module.exports = AnotherAdapter';

        fs.writeFileSync(scope.adapter, jsFile);

        try {
            storage.getStorage();
        } catch (err) {
            should.exist(err);
            should.equal(err.errorType, 'IncorrectUsageError');
        }
    });
});
