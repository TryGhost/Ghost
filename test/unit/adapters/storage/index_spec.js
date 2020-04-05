var should = require('should'),
    fs = require('fs-extra'),
    StorageBase = require('ghost-storage-base'),
    configUtils = require('../../../utils/configUtils'),
    storage = require('../../../../core/server/adapters/storage'),
    LocalFileStorage = require('../../../../core/server/adapters/storage/LocalFileStorage');

const storagePath = configUtils.config.getContentPath('adapters') + 'storage/';
describe('storage: index_spec', function () {
    var scope = {adapter: null};

    before(function () {
        if (!fs.existsSync(storagePath)) {
            fs.mkdirSync(storagePath);
        }
    });

    afterEach(function () {
        if (scope.adapter) {
            fs.unlinkSync(scope.adapter);
            scope.adapter = null;
        }

        configUtils.restore();
    });

    it('default image storage is local file storage', function () {
        var chosenStorage = storage.getStorage();
        (chosenStorage instanceof StorageBase).should.eql(true);
        (chosenStorage instanceof LocalFileStorage).should.eql(true);
    });

    it('custom adapter', function () {
        scope.adapter = storagePath + 'custom-adapter.js';

        configUtils.set({
            storage: {
                active: 'custom-adapter'
            }
        });

        var jsFile = '' +
            '\'use strict\';' +
            'var StorageBase = require(\'ghost-storage-base\');' +
            'class AnotherAdapter extends StorageBase {' +
            'exists(){}' +
            'save(){}' +
            'serve(){}' +
            'delete(){}' +
            'read(){}' +
            '}' +
            'module.exports = AnotherAdapter', chosenStorage;

        fs.writeFileSync(scope.adapter, jsFile);

        configUtils.config.get('storage:active').should.eql('custom-adapter');
        chosenStorage = storage.getStorage();
        (chosenStorage instanceof LocalFileStorage).should.eql(false);
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

        var jsFile = '' +
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
