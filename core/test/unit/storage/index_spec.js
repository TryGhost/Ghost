var fs = require('fs-extra'),
    should = require('should'),
    configUtils = require('../../utils/configUtils'),
    storage = require('../../../server/storage'),
    errors = require('../../../server/errors'),
    localFileStorage = require('../../../server/storage/local-file-store');

// to stop jshint complaining
should.equal(true, true);

describe('storage: index_spec', function () {
    var scope = {adapter: null};

    before(function () {
        if (!fs.existsSync(configUtils.config.paths.storagePath.custom)) {
            fs.mkdirSync(configUtils.config.paths.storagePath.custom);
        }
    });

    afterEach(function () {
        if (scope.adapter) {
            fs.unlinkSync(scope.adapter);
            scope.adapter = null;
        }

        configUtils.restore();
    });

    describe('default ghost storage config', function () {
        it('load without a type', function () {
            var chosenStorage = storage.getStorage();
            (chosenStorage instanceof localFileStorage).should.eql(true);
        });

        it('load with themes type', function () {
            var chosenStorage = storage.getStorage('themes');
            (chosenStorage instanceof localFileStorage).should.eql(true);
        });

        it('load with unknown type', function () {
            try {
                storage.getStorage('theme');
            } catch (err) {
                (err instanceof errors.IncorrectUsage).should.eql(true);
            }
        });
    });

    describe('custom ghost storage config', function () {
        it('images storage adapter is custom, themes is default', function () {
            scope.adapter = configUtils.config.paths.storagePath.custom + 'custom-adapter.js';

            configUtils.set({
                storage: {
                    active: {
                        images: 'custom-adapter'
                    }
                }
            });

            var jsFile = '' +
                'var util = require(\'util\');' +
                'var StorageBase = require(__dirname + \'/../../core/server/storage/base\');' +
                'var AnotherAdapter = function (){ StorageBase.call(this); };' +
                'util.inherits(AnotherAdapter, StorageBase);' +
                'AnotherAdapter.prototype.exists = function (){};' +
                'AnotherAdapter.prototype.save = function (){};' +
                'AnotherAdapter.prototype.serve = function (){};' +
                'AnotherAdapter.prototype.delete = function (){};' +
                'module.exports = AnotherAdapter', chosenStorage;

            fs.writeFileSync(scope.adapter, jsFile);

            chosenStorage = storage.getStorage('themes');
            (chosenStorage instanceof localFileStorage).should.eql(true);

            chosenStorage = storage.getStorage('images');
            (chosenStorage instanceof localFileStorage).should.eql(false);
        });
    });

    describe('adapter validation', function () {
        it('create good adapter', function () {
            scope.adapter = configUtils.config.paths.storagePath.custom + 'another-storage.js';

            configUtils.set({
                storage: {
                    active: 'another-storage'
                },
                paths: {
                    storage: __dirname + '/another-storage.js'
                }
            });

            var jsFile = '' +
                'var util = require(\'util\');' +
                'var StorageBase = require(__dirname + \'/../../core/server/storage/base\');' +
                'var AnotherAdapter = function (){ StorageBase.call(this); };' +
                'util.inherits(AnotherAdapter, StorageBase);' +
                'AnotherAdapter.prototype.exists = function (){};' +
                'AnotherAdapter.prototype.save = function (){};' +
                'AnotherAdapter.prototype.serve = function (){};' +
                'AnotherAdapter.prototype.delete = function (){};' +
                'module.exports = AnotherAdapter', adapter;

            fs.writeFileSync(scope.adapter, jsFile);

            adapter = storage.getStorage();
            should.exist(adapter);
            (adapter instanceof localFileStorage).should.eql(false);
        });

        it('create bad adapter: exists fn is missing', function () {
            scope.adapter = configUtils.config.paths.storagePath.custom + 'broken-storage.js';

            configUtils.set({
                storage: {
                    active: 'broken-storage'
                },
                paths: {
                    storage: __dirname + '/broken-storage.js'
                }
            });

            var jsFile = '' +
                'var util = require(\'util\');' +
                'var StorageBase = require(__dirname + \'/../../core/server/storage/base\');' +
                'var AnotherAdapter = function (){ StorageBase.call(this); };' +
                'util.inherits(AnotherAdapter, StorageBase);' +
                'AnotherAdapter.prototype.save = function (){};' +
                'AnotherAdapter.prototype.serve = function (){};' +
                'AnotherAdapter.prototype.delete = function (){};' +
                'module.exports = AnotherAdapter';

            fs.writeFileSync(scope.adapter, jsFile);

            try {
                storage.getStorage();
            } catch (err) {
                should.exist(err);
                (err instanceof errors.IncorrectUsage).should.eql(true);
            }
        });
    });
});
