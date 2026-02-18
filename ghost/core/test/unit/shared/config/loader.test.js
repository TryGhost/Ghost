const assert = require('node:assert/strict');
const path = require('path');
const rewire = require('rewire');
const _ = require('lodash');
const configUtils = require('../../../utils/config-utils');
const sinon = require('sinon');
const localUtils = require('../../../../core/shared/config/utils');
describe('Config Loader', function () {
    before(async function () {
        await configUtils.restore();
    });

    afterEach(async function () {
        await configUtils.restore();
    });

    describe('hierarchy of config channels', function () {
        let originalEnv;
        let originalArgv;
        let customConfig;
        let loader;
        let nodeEnvStub;

        beforeEach(function () {
            originalEnv = _.clone(process.env);
            originalArgv = _.clone(process.argv);
            loader = rewire('../../../../core/shared/config/loader');
            nodeEnvStub = sinon.stub(localUtils, 'getNodeEnv').returns('testing');
            // we manually call `loadConf` in the tests and we need to ensure that the minimum
            // required config properties are available
            process.env.paths__contentPath = 'content/';
        });

        afterEach(function () {
            process.env = originalEnv;
            process.argv = originalArgv;
            sinon.restore();
        });

        it('env parameter is stronger than file', function () {
            process.env.database__client = 'test';

            customConfig = loader.loadNconf({
                baseConfigPath: path.join(__dirname, '../../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../../utils/fixtures/config')
            });

            assert.equal(customConfig.get('database:client'), 'test');
        });

        it('argv is stronger than env parameter', function () {
            process.env.database__client = 'test';
            process.argv[2] = '--database:client=stronger';

            customConfig = loader.loadNconf({
                baseConfigPath: path.join(__dirname, '../../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../../utils/fixtures/config')
            });

            assert.equal(customConfig.get('database:client'), 'stronger');
        });

        it('argv or env is NOT stronger than overrides', function () {
            process.env.paths__corePath = 'try-to-override';
            process.argv[2] = '--paths:corePath=try-to-override';

            customConfig = loader.loadNconf({
                baseConfigPath: path.join(__dirname, '../../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../../utils/fixtures/config')
            });

            assert(!customConfig.get('paths:corePath').includes('try-to-override'));
        });

        it('overrides is stronger than every other config file', function () {
            customConfig = loader.loadNconf({
                baseConfigPath: path.join(__dirname, '../../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../../utils/fixtures/config')
            });

            assert(!customConfig.get('paths:corePath').includes('try-to-override'));
            assert.equal(customConfig.get('database:client'), 'sqlite3');
            // Note: database:connection:filename is now set via process.env in overrides.js
            // for concurrent test isolation, so we skip asserting the config file value
            assert.equal(customConfig.get('database:debug'), true);
            // Note: url is now set via process.env in overrides.js for dynamic port allocation
            assert.equal(customConfig.get('logging:level'), 'error');
            assert.deepEqual(customConfig.get('logging:transports'), ['stdout']);
        });

        it('should load JSONC files', function () {
            nodeEnvStub.returns('development');
            customConfig = loader.loadNconf({
                baseConfigPath: path.join(__dirname, '../../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../../utils/fixtures/config')
            });

            assert.equal(customConfig.get('site_uuid'), 'a58fe20c-0af0-4fc6-9b1a-20873d5b7d03');
            assert.equal(customConfig.get('commented'), undefined);
        });
    });

    describe('Index', function () {
        it('should have exactly the right keys', function () {
            const pathConfig = configUtils.config.get('paths');

            // This will fail if there are any extra keys
            // NOTE: using `Object.keys` here instead of `should.have.keys` assertion
            //       because when `have.keys` fails there's no useful diff
            //       and it doesn't make sure to check for "extra" keys
            assert.deepEqual(Object.keys(pathConfig), [
                'contentPath',
                'fixtures',
                'defaultSettings',
                'assetSrc',
                'urlCache',
                'appRoot',
                'corePath',
                'adminAssets',
                'helperTemplates',
                'defaultViews',
                'defaultRouteSettings',
                'internalAppPath',
                'internalAdaptersPath',
                'migrationPath',
                'publicFilePath'
            ]);
        });

        it('should have the correct values for each key', function () {
            const pathConfig = configUtils.config.get('paths');
            const appRoot = path.resolve(__dirname, '../../../../');

            assert.equal(pathConfig.appRoot, appRoot);
        });

        it('should allow specific properties to be user defined', function () {
            const contentPath = path.join(configUtils.config.get('paths').appRoot, 'otherContent', '/');

            configUtils.set('paths:contentPath', contentPath);
            assert.equal(configUtils.config.get('paths').contentPath, contentPath);
            assert.equal(configUtils.config.getContentPath('images'), contentPath + 'images/');
        });
    });
});
