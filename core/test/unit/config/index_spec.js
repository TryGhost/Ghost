// jscs:disable requireDotNotation

var should = require('should'),
    path = require('path'),
    rewire = require('rewire'),
    _ = require('lodash'),
    i18n = require('../../../server/i18n'),
    configUtils = require('../../utils/configUtils');

should.equal(true, true);

describe('Config', function () {
    before(function () {
        i18n.init();
        configUtils.restore();
    });

    afterEach(function () {
        configUtils.restore();
    });

    describe('hierarchy of config channels', function () {
        var originalEnv, originalArgv, customConfig, config;

        beforeEach(function () {
            originalEnv = _.clone(process.env);
            originalArgv = _.clone(process.argv);
            config = rewire('../../../server/config');
        });

        afterEach(function () {
            process.env = originalEnv;
            process.argv = originalArgv;
        });

        it('env parameter is stronger than file', function () {
            process.env['database__client'] = 'test';

            customConfig = config.loadNconf({
                baseConfigPath: path.join(__dirname, '../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../utils/fixtures/config')
            });

            customConfig.get('database:client').should.eql('test');
        });

        it('argv is stronger than env parameter', function () {
            process.env['database__client'] = 'test';
            process.argv[2] = '--database:client=stronger';

            customConfig = config.loadNconf({
                baseConfigPath: path.join(__dirname, '../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../utils/fixtures/config')
            });

            customConfig.get('database:client').should.eql('stronger');
        });

        it('argv or env is NOT stronger than overrides', function () {
            process.env['paths__corePath'] = 'try-to-override';
            process.argv[2] = '--paths:corePath=try-to-override';

            customConfig = config.loadNconf({
                baseConfigPath: path.join(__dirname, '../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../utils/fixtures/config')
            });

            customConfig.get('paths:corePath').should.not.containEql('try-to-override');
        });

        it('overrides is stronger than every other config file', function () {
            customConfig = config.loadNconf({
                baseConfigPath: path.join(__dirname, '../../utils/fixtures/config'),
                customConfigPath: path.join(__dirname, '../../utils/fixtures/config')
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

    describe('Theme', function () {
        beforeEach(function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com',
                theme: {
                    title: 'casper',
                    description: 'casper',
                    logo: 'casper',
                    cover: 'casper',
                    timezone: 'Etc/UTC',
                    icon: 'core/shared/favicon.ico'
                }
            });
        });

        it('should have exactly the right keys', function () {
            var themeConfig = configUtils.config.get('theme');

            // This will fail if there are any extra keys
            themeConfig.should.have.keys('title', 'description', 'logo', 'cover', 'timezone', 'icon');
        });

        it('should have the correct values for each key', function () {
            var themeConfig = configUtils.config.get('theme');

            // Check values are as we expect
            themeConfig.should.have.property('title', 'casper');
            themeConfig.should.have.property('description', 'casper');
            themeConfig.should.have.property('logo', 'casper');
            themeConfig.should.have.property('cover', 'casper');
            themeConfig.should.have.property('timezone', 'Etc/UTC');
            themeConfig.should.have.property('icon', 'core/shared/favicon.ico');
        });
    });

    describe('Timezone default', function () {
        it('should use timezone from settings when set', function () {
            var themeConfig = configUtils.config.get('theme');

            // Check values are as we expect
            themeConfig.should.have.property('timezone', 'Etc/UTC');

            configUtils.set({
                theme: {
                    timezone: 'Africa/Cairo'
                }
            });

            configUtils.config.get('theme').should.have.property('timezone', 'Africa/Cairo');
        });

        it('should set theme object with timezone by default', function () {
            var themeConfig = configUtils.defaultConfig;

            // Check values are as we expect
            themeConfig.should.have.property('theme');
            themeConfig.theme.should.have.property('timezone', 'Etc/UTC');
        });
    });

    describe('Index', function () {
        it('should have exactly the right keys', function () {
            var pathConfig = configUtils.config.get('paths');

            // This will fail if there are any extra keys
            pathConfig.should.have.keys(
                'appRoot',
                'internalStoragePath',
                'internalSchedulingPath',
                'contentPath',
                'corePath',
                'internalAppPath',
                'imagesRelPath',
                'adminViews',
                'helperTemplates',
                'clientAssets'
            );
        });

        it('should have the correct values for each key', function () {
            var pathConfig = configUtils.config.get('paths'),
                appRoot = path.resolve(__dirname, '../../../../');

            pathConfig.should.have.property('appRoot', appRoot);
            pathConfig.should.have.property('imagesRelPath', 'content/images');
        });

        it('should allow specific properties to be user defined', function () {
            var contentPath = path.join(configUtils.config.get('paths').appRoot, 'otherContent', '/');

            configUtils.set('paths:contentPath', contentPath);
            configUtils.config.get('paths').should.have.property('contentPath', contentPath);
            configUtils.config.getContentPath('images').should.eql(contentPath + 'images/');
        });
    });

    describe('Storage', function () {
        it('should default to local-file-store', function () {
            configUtils.config.get('paths').should.have.property('internalStoragePath', path.join(configUtils.config.get('paths').corePath, '/server/storage/'));

            configUtils.config.get('storage').should.have.property('active', {
                images: 'local-file-store',
                themes: 'local-file-store'
            });
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
