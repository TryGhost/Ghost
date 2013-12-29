/*globals describe, it, beforeEach, afterEach */

var should  = require('should'),
    sinon   = require('sinon'),
    when    = require('when'),
    path    = require('path'),

    config  = require('../../server/config');

describe('Config', function () {

    describe('Theme', function () {

        var sandbox,
            settings,
            settingsStub;

        beforeEach(function (done) {
            sandbox = sinon.sandbox.create();

            settings = {'read': function read() {}};

            settingsStub = sandbox.stub(settings, 'read', function () {
                return when({value: 'casper'});
            });

            config.theme.update(settings, 'http://my-ghost-blog.com')
                .then(done)
                .then(null, done);
        });

        afterEach(function (done) {
            config.theme.update(settings, config().url)
                .then(done)
                .then(null, done);

            sandbox.restore();
        });

        it('should have exactly the right keys', function () {
            var themeConfig = config.theme();

            // This will fail if there are any extra keys
            themeConfig.should.have.keys('url', 'title', 'description', 'logo', 'cover');
        });

        it('should have the correct values for each key', function () {
            var themeConfig = config.theme();

            // Check values are as we expect
            themeConfig.should.have.property('url', 'http://my-ghost-blog.com');
            themeConfig.should.have.property('title', 'casper');
            themeConfig.should.have.property('description', 'casper');
            themeConfig.should.have.property('logo', 'casper');
            themeConfig.should.have.property('cover', 'casper');

            // Check settings.read gets called exactly 4 times
            settingsStub.callCount.should.equal(4);
        });
    });

    describe('Paths', function () {
        var sandbox;

        beforeEach(function () {
            sandbox = sinon.sandbox.create();
        });

        afterEach(function (done) {
            config.paths.update(config().url)
                .then(done)
                .then(null, done);

            sandbox.restore();
        });

        it('should have exactly the right keys', function () {
            var pathConfig = config.paths();

            // This will fail if there are any extra keys
            pathConfig.should.have.keys(
                'appRoot',
                'subdir',
                'config',
                'configExample',
                'contentPath',
                'corePath',
                'themePath',
                'pluginPath',
                'imagesPath',
                'imagesRelPath',
                'adminViews',
                'helperTemplates',
                'exportPath',
                'lang',
                'debugPath',
                'availableThemes',
                'availablePlugins'
            );
        });

        it('should have the correct values for each key', function () {
            var pathConfig = config.paths(),
                appRoot = path.resolve(__dirname, '../../../');

            pathConfig.should.have.property('appRoot', appRoot);
            pathConfig.should.have.property('subdir', '');
        });

        it('should not return a slash for subdir', function (done) {
            config.paths.update('http://my-ghost-blog.com').then(function () {
                config.paths().should.have.property('subdir', '');

                return config.paths.update('http://my-ghost-blog.com/');
            }).then(function () {
                config.paths().should.have.property('subdir', '');

                done();
            }).otherwise(done);
        });

        it('should handle subdirectories properly', function (done) {
            config.paths.update('http://my-ghost-blog.com/blog').then(function () {
                config.paths().should.have.property('subdir', '/blog');

                return config.paths.update('http://my-ghost-blog.com/blog/');
            }).then(function () {
                config.paths().should.have.property('subdir', '/blog');

                return config.paths.update('http://my-ghost-blog.com/my/blog');
            }).then(function () {
                config.paths().should.have.property('subdir', '/my/blog');

                return config.paths.update('http://my-ghost-blog.com/my/blog/');
            }).then(function () {
                config.paths().should.have.property('subdir', '/my/blog');

                done();
            }).otherwise(done);
        });
    });
});