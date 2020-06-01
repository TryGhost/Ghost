const should = require('should');
const path = require('path');
const rewire = require('rewire');
const _ = require('lodash');
const configUtils = require('../../../utils/configUtils');

describe('Config', function () {
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
        let config;

        beforeEach(function () {
            originalEnv = _.clone(process.env);
            originalArgv = _.clone(process.argv);
            config = rewire('../../../../core/shared/config');

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

            customConfig = config.loadNconf({
                baseConfigPath: path.join(__dirname, '../../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../../utils/fixtures/config')
            });

            customConfig.get('database:client').should.eql('test');
        });

        it('argv is stronger than env parameter', function () {
            process.env.database__client = 'test';
            process.argv[2] = '--database:client=stronger';

            customConfig = config.loadNconf({
                baseConfigPath: path.join(__dirname, '../../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../../utils/fixtures/config')
            });

            customConfig.get('database:client').should.eql('stronger');
        });

        it('argv or env is NOT stronger than overrides', function () {
            process.env.paths__corePath = 'try-to-override';
            process.argv[2] = '--paths:corePath=try-to-override';

            customConfig = config.loadNconf({
                baseConfigPath: path.join(__dirname, '../../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../../utils/fixtures/config')
            });

            customConfig.get('paths:corePath').should.not.containEql('try-to-override');
        });

        it('overrides is stronger than every other config file', function () {
            customConfig = config.loadNconf({
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
            pathConfig.should.have.keys(
                'appRoot',
                'internalAdaptersPath',
                'contentPath',
                'corePath',
                'internalAppPath',
                'adminViews',
                'helperTemplates',
                'clientAssets'
            );
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

    describe('Storage', function () {
        it('should default to local-file-store', function () {
            configUtils.config.get('paths').should.have.property('internalAdaptersPath', path.join(configUtils.config.get('paths').corePath, '/server/adapters/'));

            configUtils.config.get('storage').should.have.property('active', 'LocalFileStorage');
        });

        it('no effect: setting a custom active storage as string', function () {
            configUtils.set({
                storage: {
                    active: 's3',
                    s3: {}
                }
            });

            configUtils.config.get('storage').should.have.property('active', 's3');
            configUtils.config.get('storage').should.have.property('s3', {});
        });

        it('able to set storage for themes (but not officially supported!)', function () {
            configUtils.set({
                storage: {
                    active: {
                        images: 'local-file-store',
                        themes: 's3'
                    }
                }
            });

            configUtils.config.get('storage').should.have.property('active', {
                images: 'local-file-store',
                themes: 's3'
            });
        });

        it('should allow setting a custom active storage as object', function () {
            configUtils.set({
                storage: {
                    active: {
                        images: 's2',
                        themes: 'local-file-store'
                    }
                }
            });

            configUtils.config.get('storage').should.have.property('active', {
                images: 's2',
                themes: 'local-file-store'
            });
        });
    });
});
