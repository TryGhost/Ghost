var should         = require('should'),
    sinon          = require('sinon'),
    Promise        = require('bluebird'),
    moment         = require('moment'),
    path           = require('path'),
    fs             = require('fs'),
    _              = require('lodash'),

    testUtils      = require('../../utils'),
    i18n           = require('../../../server/i18n'),
    utils          = require('../../../server/utils'),
    /*jshint unused:false*/
    db             = require('../../../server/data/db/connection'),

    // Thing we are testing
    configUtils    = require('../../utils/configUtils'),
    config         = configUtils.config;

i18n.init();

describe('Config', function () {
    before(function () {
        configUtils.restore();
    });

    afterEach(function () {
        configUtils.restore();
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
            var themeConfig = config.get('theme');

            // This will fail if there are any extra keys
            themeConfig.should.have.keys('title', 'description', 'logo', 'cover', 'timezone', 'icon');
        });

        it('should have the correct values for each key', function () {
            var themeConfig = config.get('theme');

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
            var themeConfig = config.get('theme');

            // Check values are as we expect
            themeConfig.should.have.property('timezone', 'Etc/UTC');

            configUtils.set({
                theme: {
                    timezone: 'Africa/Cairo'
                }
            });

            config.get('theme').should.have.property('timezone', 'Africa/Cairo');
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
            var pathConfig = config.get('paths');

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
            var pathConfig = config.get('paths'),
                appRoot = path.resolve(__dirname, '../../../../');

            pathConfig.should.have.property('appRoot', appRoot);
            pathConfig.should.have.property('imagesRelPath', 'content/images');
        });

        it('should allow specific properties to be user defined', function () {
            var contentPath = path.join(config.get('paths').appRoot, 'otherContent', '/');

            configUtils.set('paths:contentPath', contentPath);
            config.get('paths').should.have.property('contentPath', contentPath);
            config.getContentPath('images').should.eql(contentPath + 'images/');
        });
    });

    describe('Storage', function () {
        it('should default to local-file-store', function () {
            config.get('paths').should.have.property('internalStoragePath', path.join(config.get('paths').corePath, '/server/storage/'));

            config.get('storage').should.have.property('active', {
                images: 'local-file-store',
                themes: 'local-file-store'
            });
        });

        it('no effect: setting a custom active storage as string', function () {
            var storagePath = path.join(config.get('paths').contentPath, 'storage', 's3');

            configUtils.set({
                storage: {
                    active: 's3',
                    s3: {}
                }
            });

            config.get('storage').should.have.property('active', 's3');
            config.get('storage').should.have.property('s3', {});
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

            config.get('storage').should.have.property('active', {
                images: 'local-file-store',
                themes: 's3'
            });
        });

        it('should allow setting a custom active storage as object', function () {
            var storagePath = path.join(config.get('paths').contentPath, 'storage', 's3');

            configUtils.set({
                storage: {
                    active: {
                        images: 's2',
                        themes: 'local-file-store'
                    }
                }
            });

            config.get('storage').should.have.property('active', {
                images: 's2',
                themes: 'local-file-store'
            });
        });
    });
});
