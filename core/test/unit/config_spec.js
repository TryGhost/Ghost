/*globals describe, it, before, beforeEach, afterEach, after */
/*jshint expr:true*/
var should         = require('should'),
    sinon          = require('sinon'),
    Promise        = require('bluebird'),
    path           = require('path'),
    fs             = require('fs'),
    _              = require('lodash'),
    rewire         = require('rewire'),

    testUtils      = require('../utils'),

    // Thing we are testing
    defaultConfig  = require('../../../config.example')[process.env.NODE_ENV],
    config         = require('../../server/config'),
    origConfig     = _.cloneDeep(config),
    // storing current environment
    currentEnv     = process.env.NODE_ENV;

// To stop jshint complaining
should.equal(true, true);

function resetConfig() {
    config.set(_.merge({}, origConfig, defaultConfig));
}

describe('Config', function () {
    after(function () {
        resetConfig();
    });

    describe('Theme', function () {
        beforeEach(function () {
            config.set({
                url: 'http://my-ghost-blog.com',
                theme: {
                    title: 'casper',
                    description: 'casper',
                    logo: 'casper',
                    cover: 'casper'
                }
            });
        });

        afterEach(function () {
            resetConfig();
        });

        it('should have exactly the right keys', function () {
            var themeConfig = config.theme;

            // This will fail if there are any extra keys
            themeConfig.should.have.keys('url', 'title', 'description', 'logo', 'cover');
        });

        it('should have the correct values for each key', function () {
            var themeConfig = config.theme;

            // Check values are as we expect
            themeConfig.should.have.property('url', 'http://my-ghost-blog.com');
            themeConfig.should.have.property('title', 'casper');
            themeConfig.should.have.property('description', 'casper');
            themeConfig.should.have.property('logo', 'casper');
            themeConfig.should.have.property('cover', 'casper');
        });
    });

    describe('Index', function () {
        afterEach(function () {
            // Make a copy of the default config file
            // so we can restore it after every test.
            // Using _.merge to recursively apply every property.
            resetConfig();
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
            config.set({url: 'http://my-ghost-blog.com'});
            config.paths.should.have.property('subdir', '');

            config.set({url: 'http://my-ghost-blog.com/'});
            config.paths.should.have.property('subdir', '');
        });

        it('should handle subdirectories properly', function () {
            config.set({url: 'http://my-ghost-blog.com/blog'});
            config.paths.should.have.property('subdir', '/blog');

            config.set({url: 'http://my-ghost-blog.com/blog/'});
            config.paths.should.have.property('subdir', '/blog');

            config.set({url: 'http://my-ghost-blog.com/my/blog'});
            config.paths.should.have.property('subdir', '/my/blog');

            config.set({url: 'http://my-ghost-blog.com/my/blog/'});
            config.paths.should.have.property('subdir', '/my/blog');
        });

        it('should allow specific properties to be user defined', function () {
            var contentPath = path.join(config.paths.appRoot, 'otherContent', '/'),
                configFile = 'configFileDanceParty.js';

            config.set({
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
            resetConfig();
        });

        afterEach(function () {
            resetConfig();
        });

        it('should return the home url with no options', function () {
            config.urlFor().should.equal('/');
            config.set({url: 'http://my-ghost-blog.com/blog'});
            config.urlFor().should.equal('/blog/');
        });

        it('should return home url when asked for', function () {
            var testContext = 'home';

            config.set({url: 'http://my-ghost-blog.com'});
            config.urlFor(testContext).should.equal('/');
            config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/');

            config.set({url: 'http://my-ghost-blog.com/blog'});
            config.urlFor(testContext).should.equal('/blog/');
            config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/');
        });

        it('should return rss url when asked for', function () {
            var testContext = 'rss';

            config.set({url: 'http://my-ghost-blog.com'});
            config.urlFor(testContext).should.equal('/rss/');
            config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/rss/');

            config.set({url: 'http://my-ghost-blog.com/blog'});
            config.urlFor(testContext).should.equal('/blog/rss/');
            config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/rss/');
        });

        it('should return url for a random path when asked for', function () {
            var testContext = {relativeUrl: '/about/'};

            config.set({url: 'http://my-ghost-blog.com'});
            config.urlFor(testContext).should.equal('/about/');
            config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/about/');

            config.set({url: 'http://my-ghost-blog.com/blog'});
            config.urlFor(testContext).should.equal('/blog/about/');
            config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');
        });

        it('should return url for a post from post object', function () {
            var testContext = 'post',
                testData = {post: testUtils.DataGenerator.Content.posts[2]};

            // url is now provided on the postmodel, permalinkSetting tests are in the model_post_spec.js test
            testData.post.url = '/short-and-sweet/';
            config.set({url: 'http://my-ghost-blog.com'});
            config.urlFor(testContext, testData).should.equal('/short-and-sweet/');
            config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/short-and-sweet/');

            config.set({url: 'http://my-ghost-blog.com/blog'});
            config.urlFor(testContext, testData).should.equal('/blog/short-and-sweet/');
            config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/short-and-sweet/');
        });

        it('should return url for a tag when asked for', function () {
            var testContext = 'tag',
                testData = {tag: testUtils.DataGenerator.Content.tags[0]};

            config.set({url: 'http://my-ghost-blog.com'});
            config.urlFor(testContext, testData).should.equal('/tag/kitchen-sink/');
            config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/tag/kitchen-sink/');

            config.set({url: 'http://my-ghost-blog.com/blog'});
            config.urlFor(testContext, testData).should.equal('/blog/tag/kitchen-sink/');
            config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/tag/kitchen-sink/');
        });
    });

    describe('urlPathForPost', function () {
        it('should output correct url for post', function () {
            var permalinkSetting = '/:slug/',
                /*jshint unused:false*/
                testData = testUtils.DataGenerator.Content.posts[2],
                postLink = '/short-and-sweet/';

            // next test
            config.urlPathForPost(testData, permalinkSetting).should.equal(postLink);
        });

        it('should output correct url for post with date permalink', function () {
            var permalinkSetting = '/:year/:month/:day/:slug/',
                /*jshint unused:false*/
                testData = testUtils.DataGenerator.Content.posts[2],
                today = new Date(),
                dd = ('0' + today.getDate()).slice(-2),
                mm = ('0' + (today.getMonth() + 1)).slice(-2),
                yyyy = today.getFullYear(),
                postLink = '/' + yyyy + '/' + mm + '/' + dd + '/short-and-sweet/';
            // next test
            config.urlPathForPost(testData, permalinkSetting).should.equal(postLink);
        });

        it('should output correct url for page with date permalink', function () {
            var permalinkSetting = '/:year/:month/:day/:slug/',
                /*jshint unused:false*/
                testData = testUtils.DataGenerator.Content.posts[5],
                postLink = '/static-page-test/';
            // next test
            config.urlPathForPost(testData, permalinkSetting).should.equal(postLink);
        });
    });

    describe('File', function () {
        var sandbox,
            originalConfig,
            readFileStub,
            overrideConfig = function (newConfig) {
                readFileStub.returns(
                    _.extend({}, defaultConfig, newConfig)
                );
            },
            expectedError = new Error('expected bootstrap() to throw error but none thrown');

        before(function () {
            originalConfig = _.cloneDeep(rewire('../../server/config')._config);
        });

        beforeEach(function () {
            sandbox = sinon.sandbox.create();
            readFileStub = sandbox.stub(config, 'readFile');
        });

        afterEach(function () {
            config = rewire('../../server/config');
            resetConfig();
            sandbox.restore();
        });

        it('loads the config file if one exists', function (done) {
            // We actually want the real method here.
            readFileStub.restore();

            // the test infrastructure is setup so that there is always config present,
            // but we want to overwrite the test to actually load config.example.js, so that any local changes
            // don't break the tests
            config.set({
                paths: {
                    appRoot: path.join(originalConfig.paths.appRoot, 'config.example.js')
                }
            });

            config.load().then(function (config) {
                config.url.should.equal(defaultConfig.url);
                config.database.client.should.equal(defaultConfig.database.client);
                config.database.connection.should.eql(defaultConfig.database.connection);
                config.server.host.should.equal(defaultConfig.server.host);
                config.server.port.should.equal(defaultConfig.server.port);

                done();
            }).catch(done);
        });

        it('uses the passed in config file location', function (done) {
            // We actually want the real method here.
            readFileStub.restore();

            config.load(path.join(originalConfig.paths.appRoot, 'config.example.js')).then(function (config) {
                config.url.should.equal(defaultConfig.url);
                config.database.client.should.equal(defaultConfig.database.client);
                config.database.connection.should.eql(defaultConfig.database.connection);
                config.server.host.should.equal(defaultConfig.server.host);
                config.server.port.should.equal(defaultConfig.server.port);

                done();
            }).catch(done);
        });

        it('creates the config file if one does not exist', function (done) {
                // trick bootstrap into thinking that the config file doesn't exist yet
            var existsStub = sandbox.stub(fs, 'exists', function (file, cb) { return cb(false); }),
                // ensure that the file creation is a stub, the tests shouldn't really create a file
                writeFileStub = sandbox.stub(config, 'writeFile').returns(Promise.resolve()),
                validateStub = sandbox.stub(config, 'validate').returns(Promise.resolve());

            config.load().then(function () {
                existsStub.calledOnce.should.be.true;
                writeFileStub.calledOnce.should.be.true;
                validateStub.calledOnce.should.be.true;
                done();
            }).catch(done);
        });

        it('accepts urls with a valid scheme', function (done) {
            // replace the config file with invalid data
            overrideConfig({url: 'http://testurl.com'});

            config.load().then(function (localConfig) {
                localConfig.url.should.equal('http://testurl.com');

                // Next test
                overrideConfig({url: 'https://testurl.com'});
                return config.load();
            }).then(function (localConfig) {
                localConfig.url.should.equal('https://testurl.com');

                 // Next test
                overrideConfig({url: 'http://testurl.com/blog/'});
                return config.load();
            }).then(function (localConfig) {
                localConfig.url.should.equal('http://testurl.com/blog/');

                 // Next test
                overrideConfig({url: 'http://testurl.com/ghostly/'});
                return config.load();
            }).then(function (localConfig) {
                localConfig.url.should.equal('http://testurl.com/ghostly/');

                done();
            }).catch(done);
        });

        it('rejects a fqdn without a scheme', function (done) {
            overrideConfig({url: 'example.com'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('rejects a hostname without a scheme', function (done) {
            overrideConfig({url: 'example'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('rejects a hostname with a scheme', function (done) {
            overrideConfig({url: 'https://example'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('rejects a url with an unsupported scheme', function (done) {
            overrideConfig({url: 'ftp://example.com'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('rejects a url with a protocol relative scheme', function (done) {
            overrideConfig({url: '//example.com'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('does not permit the word ghost as a url path', function (done) {
            overrideConfig({url: 'http://example.com/ghost/'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('does not permit the word ghost to be a component in a url path', function (done) {
            overrideConfig({url: 'http://example.com/blog/ghost/'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('does not permit the word ghost to be a component in a url path', function (done) {
            overrideConfig({url: 'http://example.com/ghost/blog/'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('does not permit database config to be falsy', function (done) {
            // replace the config file with invalid data
            overrideConfig({database: false});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('does not permit database config to be empty', function (done) {
            // replace the config file with invalid data
            overrideConfig({database: {}});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('requires server to be present', function (done) {
            overrideConfig({server: false});

            config.load().then(function (localConfig) {
                /*jshint unused:false*/
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('allows server to use a socket', function (done) {
            overrideConfig({server: {socket: 'test'}});

            config.load().then(function () {
                var socketConfig = config.getSocket();

                socketConfig.should.be.an.Object;
                socketConfig.path.should.equal('test');
                socketConfig.permissions.should.equal('660');

                done();
            }).catch(done);
        });

        it('allows server to use a socket and user-defined permissions', function (done) {
            overrideConfig({
                server: {
                    socket: {
                        path: 'test',
                        permissions: '666'
                    }
                }
            });

            config.load().then(function () {
                var socketConfig = config.getSocket();

                socketConfig.should.be.an.Object;
                socketConfig.path.should.equal('test');
                socketConfig.permissions.should.equal('666');

                done();
            }).catch(done);
        });

        it('allows server to have a host and a port', function (done) {
            overrideConfig({server: {host: '127.0.0.1', port: '2368'}});

            config.load().then(function (localConfig) {
                should.exist(localConfig);
                localConfig.server.host.should.equal('127.0.0.1');
                localConfig.server.port.should.equal('2368');

                done();
            }).catch(done);
        });

        it('rejects server if there is a host but no port', function (done) {
            overrideConfig({server: {host: '127.0.0.1'}});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('rejects server if there is a port but no host', function (done) {
            overrideConfig({server: {port: '2368'}});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('rejects server if configuration is empty', function (done) {
            overrideConfig({server: {}});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });
    });

    describe('Check for deprecation messages:', function () {
        var logStub,
            // Can't use afterEach here, because mocha uses console.log to output the checkboxes
            // which we've just stubbed, so we need to restore it before the test ends to see ticks.
            resetEnvironment = function () {
                logStub.restore();
                process.env.NODE_ENV = currentEnv;
            };

        beforeEach(function () {
            logStub = sinon.stub(console, 'log');
            process.env.NODE_ENV = 'development';
        });

        afterEach(function () {
            logStub.restore();
            config = rewire('../../server/config');
        });

        it('doesn\'t display warning when deprecated options not set', function () {
            config.checkDeprecated();
            logStub.calledOnce.should.be.false;

            // Future tests: This is important here!
            resetEnvironment();
        });

        it('displays warning when updateCheck exists and is truthy', function () {
            config.set({
                updateCheck: 'foo'
            });
            // Run the test code
            config.checkDeprecated();

            logStub.calledOnce.should.be.true;

            logStub.calledWithMatch(null, 'updateCheck').should.be.false;
            logStub.calledWithMatch('', 'updateCheck').should.be.true;
            logStub.calledWithMatch(sinon.match.string, 'updateCheck').should.be.true;
            logStub.calledWithMatch(sinon.match.number, 'updateCheck').should.be.false;

            // Future tests: This is important here!
            resetEnvironment();
        });

        it('displays warning when updateCheck exists and is falsy', function () {
            config.set({
                updateCheck: undefined
            });
            // Run the test code
            config.checkDeprecated();

            logStub.calledOnce.should.be.true;

            logStub.calledWithMatch(null, 'updateCheck').should.be.false;
            logStub.calledWithMatch('', 'updateCheck').should.be.true;
            logStub.calledWithMatch(sinon.match.string, 'updateCheck').should.be.true;
            logStub.calledWithMatch(sinon.match.number, 'updateCheck').should.be.false;

            // Future tests: This is important here!
            resetEnvironment();
        });

        it('displays warning when mail.fromaddress exists and is truthy', function () {
            config.set({
                mail: {
                    fromaddress: 'foo'
                }
            });
            // Run the test code
            config.checkDeprecated();

            logStub.calledOnce.should.be.true;

            logStub.calledWithMatch(null, 'mail.fromaddress').should.be.false;
            logStub.calledWithMatch('', 'mail.fromaddress').should.be.true;
            logStub.calledWithMatch(sinon.match.string, 'mail.fromaddress').should.be.true;
            logStub.calledWithMatch(sinon.match.number, 'mail.fromaddress').should.be.false;

            // Future tests: This is important here!
            resetEnvironment();
        });

        it('displays warning when mail.fromaddress exists and is falsy', function () {
            config.set({
                mail: {
                    fromaddress: undefined
                }
            });
            // Run the test code
            config.checkDeprecated();

            logStub.calledOnce.should.be.true;
            logStub.calledWithMatch(null, 'mail.fromaddress').should.be.false;
            logStub.calledWithMatch('', 'mail.fromaddress').should.be.true;
            logStub.calledWithMatch(sinon.match.string, 'mail.fromaddress').should.be.true;
            logStub.calledWithMatch(sinon.match.number, 'mail.fromaddress').should.be.false;

            // Future tests: This is important here!
            resetEnvironment();
        });

        it('doesn\'t display warning when only part of a deprecated option is set', function () {
            config.set({
                mail: {
                    notfromaddress: 'foo'
                }
            });

            config.checkDeprecated();
            logStub.calledOnce.should.be.false;

            // Future tests: This is important here!
            resetEnvironment();
        });

        it('can not modify the deprecatedItems on the config object', function () {
            config.set({
                deprecatedItems: ['foo']
            });

            config.deprecatedItems.should.not.equal(['foo']);
            resetEnvironment();
        });
    });
});
