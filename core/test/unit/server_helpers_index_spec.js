/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var should         = require('should'),
    _              = require('lodash'),
    rewire         = require('rewire'),
    hbs            = require('express-hbs'),

    // Stuff we are testing
    helpers        = rewire('../../server/helpers'),
    config         = rewire('../../server/config');

describe('Helpers', function () {
    var overrideConfig = function (newConfig) {
            var existingConfig = helpers.__get__('config');
            config.set(_.extend(existingConfig, newConfig));
        };

    beforeEach(function () {
        var adminHbs = hbs.create();
        helpers = rewire('../../server/helpers');

        overrideConfig({
            paths: {
                subdir: ''
            },
            theme: {
                url: 'http://testurl.com'
            }
        });

        helpers.loadCoreHelpers(adminHbs);
    });

    describe('helperMissing', function () {
        it('should not throw an error', function () {
            var helperMissing = helpers.__get__('coreHelpers.helperMissing');

            should.exist(helperMissing);

            function runHelper() {
                var args = arguments;
                return function () {
                    helperMissing.apply(null, args);
                };
            }

            runHelper('test helper').should.not.throwError();
            runHelper('test helper', 'second argument').should.not.throwError();
        });
    });

    describe('file storage helper', function () {
        it('is loaded', function () {
            should.exist(helpers.file_storage);
        });

        it('should return the string true when config() has no fileStorage property', function () {
            var fileStorage = helpers.file_storage();

            should.exist(fileStorage);
            fileStorage.should.equal('true');
        });

        it('should return the config.fileStorage value when it exists', function () {
            var setting = 'file storage value',
                cfg = helpers.__get__('config'),
                fileStorage;

            _.extend(cfg, {
                fileStorage: setting
            });

            fileStorage = helpers.file_storage();

            should.exist(fileStorage);
            fileStorage.should.equal(setting);
        });

        it('should just return true if config.fileStorage is an object', function () {
            var setting = {someKey: 'someValue'},
                cfg = helpers.__get__('config'),
                fileStorage;

            _.extend(cfg, {
                fileStorage: setting
            });

            fileStorage = helpers.file_storage();

            should.exist(fileStorage);
            fileStorage.should.equal('true');
        });
    });

    describe('apps helper', function () {
        it('is loaded', function () {
            should.exist(helpers.apps);
        });

        it('should return the string false when config() has no apps property', function () {
            var apps = helpers.apps();

            should.exist(apps);
            apps.should.equal('false');
        });

        it('should return the config.apps value when it exists', function () {
            var setting = 'app value',
                cfg = helpers.__get__('config'),
                apps;

            _.extend(cfg, {
                apps: setting
            });

            apps = helpers.apps();

            should.exist(apps);
            apps.should.equal(setting);
        });
    });

    describe('blog_url helper', function () {
        var configUrl = config.url;

        afterEach(function () {
            config.set({url: configUrl});
        });

        it('is loaded', function () {
            should.exist(helpers.blog_url);
        });

        it('should return the test url by default', function () {
            var blogUrl = helpers.blog_url();

            should.exist(blogUrl);
            // this is set in another test == bad!
            blogUrl.should.equal('http://testurl.com');
        });
    });
});
