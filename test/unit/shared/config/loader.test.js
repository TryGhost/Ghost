const should = require('should');
const path = require('path');
const rewire = require('rewire');
const _ = require('lodash');
const configUtils = require('../../../utils/configUtils');

describe('Config Loader', function () {
    before(function () {
        configUtils.restore();
    });

    afterEach(function () {
        configUtils.restore();
    });

    describe('hierarchy of config channels', function () {
        let originalEnv;
        let originalArgv;
        let customConfig;
        let loader;

        beforeEach(function () {
            originalEnv = _.clone(process.env);
            originalArgv = _.clone(process.argv);
            loader = rewire('../../../../core/shared/config/loader');

            // we manually call `loadConf` in the tests and we need to ensure that the minimum
            // required config properties are available
            process.env.paths__contentPath = 'content/';
        });

        afterEach(function () {
            process.env = originalEnv;
            process.argv = originalArgv;
        });

        it('env parameter is stronger than file', function () {
            process.env.database__client = 'test';

            customConfig = loader.loadNconf({
                baseConfigPath: path.join(__dirname, '../../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../../utils/fixtures/config')
            });

            customConfig.get('database:client').should.eql('test');
        });

        it('argv is stronger than env parameter', function () {
            process.env.database__client = 'test';
            process.argv[2] = '--database:client=stronger';

            customConfig = loader.loadNconf({
                baseConfigPath: path.join(__dirname, '../../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../../utils/fixtures/config')
            });

            customConfig.get('database:client').should.eql('stronger');
        });

        it('argv or env is NOT stronger than overrides', function () {
            process.env.paths__corePath = 'try-to-override';
            process.argv[2] = '--paths:corePath=try-to-override';

            customConfig = loader.loadNconf({
                baseConfigPath: path.join(__dirname, '../../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../../utils/fixtures/config')
            });

            customConfig.get('paths:corePath').should.not.containEql('try-to-override');
        });

        it('overrides is stronger than every other config file', function () {
            customConfig = loader.loadNconf({
                baseConfigPath: path.join(__dirname, '../../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../../utils/fixtures/config')
            });

            customConfig.get('paths:corePath').should.not.containEql('try-to-override');
            customConfig.get('database:client').should.eql('sqlite3');
            customConfig.get('database:connection:filename').should.eql('/hehe.db');
            customConfig.get('database:debug').should.eql(true);
            customConfig.get('url').should.eql('http://localhost:2368');
            customConfig.get('logging:level').should.eql('error');
            customConfig.get('logging:transports').should.eql(['stdout']);
        });
    });

    describe('Index', function () {
        it('should have exactly the right keys', function () {
            const pathConfig = configUtils.config.get('paths');

            // This will fail if there are any extra keys
            // NOTE: using `Object.keys` here instead of `should.have.keys` assertion
            //       because when `have.keys` fails there's no useful diff
            //       and it doesn't make sure to check for "extra" keys
            Object.keys(pathConfig).should.eql([
                'contentPath',
                'fixtures',
                'defaultSettings',
                'assetSrc',
                'urlCache',
                'appRoot',
                'corePath',
                'adminAssets',
                'helperTemplates',
                'adminViews',
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

            pathConfig.should.have.property('appRoot', appRoot);
        });

        it('should allow specific properties to be user defined', function () {
            const contentPath = path.join(configUtils.config.get('paths').appRoot, 'otherContent', '/');

            configUtils.set('paths:contentPath', contentPath);
            configUtils.config.get('paths').should.have.property('contentPath', contentPath);
            configUtils.config.getContentPath('images').should.eql(contentPath + 'images/');
        });
    });
});
