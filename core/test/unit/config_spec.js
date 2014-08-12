/*globals describe, it, before, beforeEach, afterEach */
/*jshint expr:true*/
var should         = require('should'),
    sinon          = require('sinon'),
    when           = require('when'),
    path           = require('path'),
    _              = require('lodash'),
    rewire         = require('rewire'),

    testUtils      = require('../utils'),

    // Thing we are testing
    defaultConfig  = require('../../../config.example')[process.env.NODE_ENV],
    theme          = rewire('../../server/config/theme'),
    config         = rewire('../../server/config'),
    configUpdate   = config.__get__('updateConfig');

// To stop jshint complaining
should.equal(true, true);

describe('Config', function () {

    describe('Theme', function () {

        var sandbox,
            settings,
            settingsStub;

        beforeEach(function (done) {
            sandbox = sinon.sandbox.create();

            settings = {'read': function read() {}};

            settingsStub = sandbox.stub(settings, 'read', function () {
                return when({ settings: [{value: 'casper'}] });
            });

            theme.update(settings, 'http://my-ghost-blog.com')
                .then(done)
                .catch(done);
        });

        afterEach(function (done) {
            theme.update(settings, defaultConfig.url)
                .then(done)
                .catch(done);

            sandbox.restore();
        });

        it('should have exactly the right keys', function () {
            var themeConfig = theme();

            // This will fail if there are any extra keys
            themeConfig.should.have.keys('url', 'title', 'description', 'logo', 'cover');
        });

        it('should have the correct values for each key', function () {
            var themeConfig = theme();

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

    describe('Index', function () {

        afterEach(function () {
            // Make a copy of the default config file
            // so we can restore it after every test.
            // Using _.merge to recursively apply every property.
            configUpdate(_.merge({}, config));
        });

        it('should have exactly the right keys', function () {
            var pathConfig = config.paths;

            // This will fail if there are any extra keys
            pathConfig.should.have.keys(
                'appRoot',
                'subdir',
                'config',
                'configExample',
                'contentPath',
                'corePath',
                'themePath',
                'appPath',
                'imagesPath',
                'imagesRelPath',
                'adminViews',
                'helperTemplates',
                'exportPath',
                'lang',
                'debugPath',
                'availableThemes',
                'availableApps',
                'builtScriptPath'
            );
        });

        it('should have the correct values for each key', function () {
            var pathConfig = config.paths,
                appRoot = path.resolve(__dirname, '../../../');

            pathConfig.should.have.property('appRoot', appRoot);
            pathConfig.should.have.property('subdir', '');
        });

        it('should not return a slash for subdir', function () {
            configUpdate({url: 'http://my-ghost-blog.com'});
            config.paths.should.have.property('subdir', '');

            configUpdate({url: 'http://my-ghost-blog.com/'});
            config.paths.should.have.property('subdir', '');
        });

        it('should handle subdirectories properly', function () {
            configUpdate({url: 'http://my-ghost-blog.com/blog'});
            config.paths.should.have.property('subdir', '/blog');

            configUpdate({url: 'http://my-ghost-blog.com/blog/'});
            config.paths.should.have.property('subdir', '/blog');

            configUpdate({url: 'http://my-ghost-blog.com/my/blog'});
            config.paths.should.have.property('subdir', '/my/blog');

            configUpdate({url: 'http://my-ghost-blog.com/my/blog/'});
            config.paths.should.have.property('subdir', '/my/blog');
        });

        it('should allow specific properties to be user defined', function () {
            var contentPath = path.join(config.paths.appRoot, 'otherContent', '/'),
                configFile = 'configFileDanceParty.js';

            configUpdate({
                config: configFile,
                paths: {
                    contentPath: contentPath
                }
            });

            config.should.have.property('config', configFile);
            config.paths.should.have.property('contentPath', contentPath);
            config.paths.should.have.property('themePath', contentPath + 'themes');
            config.paths.should.have.property('appPath', contentPath + 'apps');
            config.paths.should.have.property('imagesPath', contentPath + 'images');
        });
    });

    describe('urlFor', function () {

        before(function () {
            configUpdate(_.merge({}, defaultConfig));
        });

        afterEach(function () {
            configUpdate({url: defaultConfig.url});
        });

        it('should return the home url with no options', function () {
            config.urlFor().should.equal('/');
            configUpdate({url: 'http://my-ghost-blog.com/blog'});
            config.urlFor().should.equal('/blog/');
        });

        it('should return home url when asked for', function () {
            var testContext = 'home';

            configUpdate({url: 'http://my-ghost-blog.com'});
            config.urlFor(testContext).should.equal('/');
            config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/');

            configUpdate({url: 'http://my-ghost-blog.com/blog'});
            config.urlFor(testContext).should.equal('/blog/');
            config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/');
        });

        it('should return rss url when asked for', function () {
            var testContext = 'rss';

            configUpdate({url: 'http://my-ghost-blog.com'});
            config.urlFor(testContext).should.equal('/rss/');
            config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/rss/');

            configUpdate({url: 'http://my-ghost-blog.com/blog'});
            config.urlFor(testContext).should.equal('/blog/rss/');
            config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/rss/');
        });

        it('should return url for a random path when asked for', function () {
            var testContext = {relativeUrl: '/about/'};

            configUpdate({url: 'http://my-ghost-blog.com'});
            config.urlFor(testContext).should.equal('/about/');
            config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/about/');

            configUpdate({url: 'http://my-ghost-blog.com/blog'});
            config.urlFor(testContext).should.equal('/blog/about/');
            config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');
        });

        it('should return url for a post when asked for', function () {
            var testContext = 'post',
                testData = {post: testUtils.DataGenerator.Content.posts[2], permalinks: {value: '/:slug/'}};

            configUpdate({url: 'http://my-ghost-blog.com'});
            config.urlFor(testContext, testData).should.equal('/short-and-sweet/');
            config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/short-and-sweet/');

            configUpdate({url: 'http://my-ghost-blog.com/blog'});
            config.urlFor(testContext, testData).should.equal('/blog/short-and-sweet/');
            config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/short-and-sweet/');
        });

        it('should return url for a dated post when asked for', function () {
            var testContext = 'post',
                testData = {
                    post: testUtils.DataGenerator.Content.posts[2],
                    permalinks: {value: '/:year/:month/:day/:slug/'}
                },
                today = new Date(),
                dd = ('0' + today.getDate()).slice(-2),
                mm = ('0' + (today.getMonth() + 1)).slice(-2),
                yyyy = today.getFullYear(),
                postLink = '/' + yyyy + '/' + mm + '/' + dd + '/short-and-sweet/';

            configUpdate({url: 'http://my-ghost-blog.com'});
            config.urlFor(testContext, testData).should.equal(postLink);
            config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com' + postLink);

            configUpdate({url: 'http://my-ghost-blog.com/blog'});
            config.urlFor(testContext, testData).should.equal('/blog' + postLink);
            config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog' + postLink);
        });

        it('should return url for a tag when asked for', function () {
            var testContext = 'tag',
                testData = {tag: testUtils.DataGenerator.Content.tags[0]};

            configUpdate({url: 'http://my-ghost-blog.com'});
            config.urlFor(testContext, testData).should.equal('/tag/kitchen-sink/');
            config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/tag/kitchen-sink/');

            configUpdate({url: 'http://my-ghost-blog.com/blog'});
            config.urlFor(testContext, testData).should.equal('/blog/tag/kitchen-sink/');
            config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/tag/kitchen-sink/');
        });

    });

    describe('urlForPost', function () {
        var sandbox;

        beforeEach(function () {
            sandbox = sinon.sandbox.create();
        });

        afterEach(function () {
            sandbox.restore();
            configUpdate({url: defaultConfig.url});
        });

        it('should output correct url for post', function (done) {
            var settings = {'read': function read() {}},
                settingsStub = sandbox.stub(settings, 'read', function () {
                    return when({ settings: [{value: '/:slug/'}] });
                }),
                /*jshint unused:false*/
                testData = testUtils.DataGenerator.Content.posts[2],
                postLink = '/short-and-sweet/';

            configUpdate({url: 'http://my-ghost-blog.com'});

            // next test
            config.urlForPost(settings, testData).then(function (url) {
                url.should.equal(postLink);

                // next test
                return config.urlForPost(settings, testData, true);
            }).then(function (url) {
                url.should.equal('http://my-ghost-blog.com' + postLink);

                return configUpdate({url: 'http://my-ghost-blog.com/blog'});
            }).then(function () {

                // next test
                return config.urlForPost(settings, testData);
            }).then(function (url) {
                url.should.equal('/blog' + postLink);

                // next test
                return config.urlForPost(settings, testData, true);
            }).then(function (url) {
                url.should.equal('http://my-ghost-blog.com/blog' + postLink);

                done();
            }).catch(done);

        });

        it('should output correct url for post with date permalink', function (done) {
            var settings = {'read': function read() {}},
                settingsStub = sandbox.stub(settings, 'read', function () {
                    return when({ settings: [{value: '/:year/:month/:day/:slug/'}] });
                }),
                /*jshint unused:false*/
                testData = testUtils.DataGenerator.Content.posts[2],
                today = new Date(),
                dd = ('0' + today.getDate()).slice(-2),
                mm = ('0' + (today.getMonth() + 1)).slice(-2),
                yyyy = today.getFullYear(),
                postLink = '/' + yyyy + '/' + mm + '/' + dd + '/short-and-sweet/';

            configUpdate({url: 'http://my-ghost-blog.com'});

            // next test
            config.urlForPost(settings, testData).then(function (url) {
                url.should.equal(postLink);

                // next test
                return config.urlForPost(settings, testData, true);
            }).then(function (url) {
                url.should.equal('http://my-ghost-blog.com' + postLink);

                return configUpdate({url: 'http://my-ghost-blog.com/blog'});
            }).then(function () {

                // next test
                return config.urlForPost(settings, testData);
            }).then(function (url) {
                url.should.equal('/blog' + postLink);

                // next test
                return config.urlForPost(settings, testData, true);
            }).then(function (url) {
                url.should.equal('http://my-ghost-blog.com/blog' + postLink);

                done();
            }).catch(done);
        });

        it('should output correct url for page with date permalink', function (done) {
            var settings = {'read': function read() {}},
                settingsStub = sandbox.stub(settings, 'read', function () {
                    return when({ settings: [{value: '/:year/:month/:day/:slug/'}] });
                }),
                /*jshint unused:false*/
                testData = testUtils.DataGenerator.Content.posts[5],
                postLink = '/static-page-test/';

            configUpdate({url: 'http://my-ghost-blog.com'});

            // next test
            config.urlForPost(settings, testData).then(function (url) {
                url.should.equal(postLink);

                // next test
                return config.urlForPost(settings, testData, true);
            }).then(function (url) {
                url.should.equal('http://my-ghost-blog.com' + postLink);

                return configUpdate({url: 'http://my-ghost-blog.com/blog'});
            }).then(function () {

                // next test
                return config.urlForPost(settings, testData);
            }).then(function (url) {
                url.should.equal('/blog' + postLink);

                // next test
                return config.urlForPost(settings, testData, true);
            }).then(function (url) {
                url.should.equal('http://my-ghost-blog.com/blog' + postLink);

                done();
            }).catch(done);
        });
    });
});