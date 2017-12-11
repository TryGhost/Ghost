var should = require('should'), // jshint ignore:line
    fs = require('fs-extra'),
    StorageBase = require('ghost-storage-base'),
    configUtils = require('../../../utils/configUtils'),
    storage = require('../../../../server/adapters/storage'),
    common = require('../../../../server/lib/common'),
    LocalFileStorage = require('../../../../server/adapters/storage/LocalFileStorage');

describe('storage: index_spec', function () {
    var scope = {adapter: null};

    before(function () {
        if (!fs.existsSync(configUtils.config.getContentPath('storage'))) {
            fs.mkdirSync(configUtils.config.getContentPath('storage'));
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
        scope.adapter = configUtils.config.getContentPath('storage') + 'custom-adapter.js';

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
        scope.adapter = configUtils.config.getContentPath('storage') + 'broken-storage.js';

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
            (err instanceof common.errors.IncorrectUsageError).should.eql(true);
        }
    });
});
