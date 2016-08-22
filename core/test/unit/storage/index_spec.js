var fs = require('fs-extra'),
    should = require('should'),
    configUtils = require('../../utils/configUtils'),
    storage = require('../../../server/storage'),
    errors = require('../../../server/errors'),
    localFileStorage = require('../../../server/storage/local-file-store');

// to stop jshint complaining
should.equal(true, true);

describe('storage: index_spec', function () {
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
                'module.exports = AnotherAdapter', chosenStorage;

            if (!fs.existsSync(configUtils.config.paths.storagePath.custom)) {
                fs.mkdirSync(configUtils.config.paths.storagePath.custom);
            }

            fs.writeFileSync(configUtils.config.paths.storagePath.custom + 'custom-adapter.js', jsFile);

            chosenStorage = storage.getStorage('themes');
            (chosenStorage instanceof localFileStorage).should.eql(true);

            chosenStorage = storage.getStorage('images');
            (chosenStorage instanceof localFileStorage).should.eql(false);

            fs.unlinkSync(configUtils.config.paths.storagePath.custom + 'custom-adapter.js');
        });
    });
});
