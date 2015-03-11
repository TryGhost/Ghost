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
    urlUtils       = require('../../server/utils/url'),
    origConfig     = _.cloneDeep(config.get()),
    // storing current environment
    currentEnv     = process.env.NODE_ENV;

// To stop jshint complaining
should.equal(true, true);

function resetConfig() {
    config.merge(_.merge({}, origConfig, defaultConfig));
}

describe('Config', function () {
    after(function () {
        resetConfig();
    });

    describe('Theme', function () {
        beforeEach(function () {
            config.set('url', 'http://my-ghost-blog.com');
            config.set('theme', {
                title: 'casper',
                description: 'casper',
                logo: 'casper',
                cover: 'casper'
            });
            config.reconfigure();
        });

        afterEach(function () {
            resetConfig();
        });

        it('should have exactly the right keys', function () {
            var themeConfig = config.get('theme');

            // This will fail if there are any extra keys
            themeConfig.should.have.keys('url', 'title', 'description', 'logo', 'cover');
        });

        it('should have the correct values for each key', function () {
            var themeConfig = config.get('theme');

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
            var pathConfig = config.get('paths');

            // This will fail if there are any extra keys
            pathConfig.should.have.keys(
                'appRoot',
                'subdir',
                'config',
                'configExample',
                'storage',
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
                'clientAssets'
            );
        });

        it('should have the correct values for each key', function () {
            var pathConfig = config.get('paths'),
                appRoot = path.resolve(__dirname, '../../../');

            pathConfig.should.have.property('appRoot', appRoot);
            pathConfig.should.have.property('subdir', '');
        });

        it('should not return a slash for subdir', function () {
            config.set('url', 'http://my-ghost-blog.com');
            config.get('paths').should.have.property('subdir', '');

            config.set('url', 'http://my-ghost-blog.com/');
            config.get('paths').should.have.property('subdir', '');
        });

        it('should handle subdirectories properly', function () {
            config.set('url', 'http://my-ghost-blog.com/blog');
            config.reconfigure();
            config.get('paths').should.have.property('subdir', '/blog');

            config.set('url', 'http://my-ghost-blog.com/blog/');
            config.reconfigure();
            config.get('paths').should.have.property('subdir', '/blog');

            config.set('url', 'http://my-ghost-blog.com/my/blog');
            config.reconfigure();
            config.get('paths').should.have.property('subdir', '/my/blog');

            config.set('url', 'http://my-ghost-blog.com/my/blog/');
            config.reconfigure();
            config.get('paths').should.have.property('subdir', '/my/blog');
        });

        it('should allow specific properties to be user defined', function () {
            var contentPath = path.join(config.get('paths:appRoot'), 'otherContent'),
                configFile = 'configFileDanceParty.js';

            config.reconfigure({
                config: configFile,
                paths: {
                    contentPath: contentPath
                }
            });

            config.get().should.have.property('config', configFile);
            config.get('paths').should.have.property('contentPath', contentPath);
            config.get('paths').should.have.property('themePath', path.join(contentPath, 'themes'));
            config.get('paths').should.have.property('appPath', path.join(contentPath, 'apps'));
            config.get('paths').should.have.property('imagesPath', path.join(contentPath, 'images'));
        });
    });

    describe('Storage', function () {
        afterEach(function () {
            resetConfig();
        });

        it('should default to local-file-store', function () {
            var paths,
                storage,
                storagePath;

            paths = config.get('paths');
            storage = config.get('storage');
            storagePath = path.join(paths.corePath, '/server/storage/', 'local-file-store');

            paths.should.have.property('storage', storagePath);
            storage.should.have.property('active', 'local-file-store');
        });

        it('should allow setting a custom active storage', function () {
            var paths,
                storage,
                storagePath;

            paths = config.get('paths');
            storage = config.get('storage');
            storagePath = path.join(paths.contentPath, 'storage', 's3');
            config.set('storage', {
                active: 's3',
                s3: {}
            });
            config.reconfigure();
            config.get('paths').should.have.property('storage', storagePath);
            config.get('storage').should.have.property('active', 's3');
            config.get('storage').should.have.property('s3', {});
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
            urlUtils.urlFor().should.equal('/');
            config.set('url', 'http://my-ghost-blog.com/blog');
            config.reconfigure();
            urlUtils.urlFor().should.equal('/blog/');
        });

        it('should return home url when asked for', function () {
            var testContext = 'home';

            config.set('url', 'http://my-ghost-blog.com');
            config.reconfigure();
            urlUtils.urlFor(testContext).should.equal('/');
            urlUtils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/');

            config.set('url', 'http://my-ghost-blog.com/blog');
            config.reconfigure();
            urlUtils.urlFor(testContext).should.equal('/blog/');
            urlUtils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/');
        });

        it('should return rss url when asked for', function () {
            var testContext = 'rss';

            config.set('url', 'http://my-ghost-blog.com');
            config.reconfigure();

            urlUtils.urlFor(testContext).should.equal('/rss/');
            urlUtils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/rss/');

            config.set('url', 'http://my-ghost-blog.com/blog');
            config.reconfigure();
            urlUtils.urlFor(testContext).should.equal('/blog/rss/');
            urlUtils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/rss/');
        });

        it('should return url for a random path when asked for', function () {
            var testContext = {relativeUrl: '/about/'};

            config.set('url', 'http://my-ghost-blog.com');
            config.reconfigure();
            urlUtils.urlFor(testContext).should.equal('/about/');
            urlUtils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/about/');

            config.set('url', 'http://my-ghost-blog.com/blog');
            config.reconfigure();
            urlUtils.urlFor(testContext).should.equal('/blog/about/');
            urlUtils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');
        });

        it('should return url for a post from post object', function () {
            var testContext = 'post',
                testData = {post: testUtils.DataGenerator.Content.posts[2]};

            // url is now provided on the postmodel, permalinkSetting tests are in the model_post_spec.js test
            testData.post.url = '/short-and-sweet/';
            config.set('url', 'http://my-ghost-blog.com');
            config.reconfigure();
            urlUtils.urlFor(testContext, testData).should.equal('/short-and-sweet/');
            urlUtils.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/short-and-sweet/');

            config.set('url', 'http://my-ghost-blog.com/blog');
            config.reconfigure();
            urlUtils.urlFor(testContext, testData).should.equal('/blog/short-and-sweet/');
            urlUtils.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/short-and-sweet/');
        });

        it('should return url for a tag when asked for', function () {
            var testContext = 'tag',
                testData = {tag: testUtils.DataGenerator.Content.tags[0]};

            config.set('url', 'http://my-ghost-blog.com');
            config.reconfigure();
            urlUtils.urlFor(testContext, testData).should.equal('/tag/kitchen-sink/');
            urlUtils.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/tag/kitchen-sink/');

            config.set('url', 'http://my-ghost-blog.com/blog');
            config.reconfigure();
            urlUtils.urlFor(testContext, testData).should.equal('/blog/tag/kitchen-sink/');
            urlUtils.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/tag/kitchen-sink/');
        });
    });

    describe('urlPathForPost', function () {
        it('should output correct url for post', function () {
            var permalinkSetting = '/:slug/',
                /*jshint unused:false*/
                testData = testUtils.DataGenerator.Content.posts[2],
                postLink = '/short-and-sweet/';

            // next test
            urlUtils.urlPathForPost(testData, permalinkSetting).should.equal(postLink);
        });

        it('should output correct url for post with date permalink', function () {
            var permalinkSetting = '/:year/:month/:day/:slug/',
                /*jshint unused:false*/
                testData = testUtils.DataGenerator.Content.posts[2],
                today = testData.published_at,
                dd = ('0' + today.getDate()).slice(-2),
                mm = ('0' + (today.getMonth() + 1)).slice(-2),
                yyyy = today.getFullYear(),
                postLink = '/' + yyyy + '/' + mm + '/' + dd + '/short-and-sweet/';
            // next test
            urlUtils.urlPathForPost(testData, permalinkSetting).should.equal(postLink);
        });

        it('should output correct url for page with date permalink', function () {
            var permalinkSetting = '/:year/:month/:day/:slug/',
                /*jshint unused:false*/
                testData = testUtils.DataGenerator.Content.posts[5],
                postLink = '/static-page-test/';
            // next test
            urlUtils.urlPathForPost(testData, permalinkSetting).should.equal(postLink);
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
            originalConfig = _.cloneDeep(rewire('../../server/config').get());
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
            config.set('paths', {
                config: path.join(originalConfig.paths.appRoot, 'config.example.js')
            });

            config.read().then(function (config) {
                config.url.should.equal(defaultConfig.url);
                config.database.client.should.equal(defaultConfig.database.client);
                config.server.host.should.equal(defaultConfig.server.host);
                config.server.port.should.equal(defaultConfig.server.port);

                if (defaultConfig.database.client === 'sqlite3') {
                    config.database.connection.filename.should.eql(defaultConfig.database.connection.filename);
                } else {
                    config.database.connection.host.should.eql(defaultConfig.database.connection.host);
                    config.database.connection.password.should.eql(defaultConfig.database.connection.password);
                    config.database.connection.user.should.eql(defaultConfig.database.connection.user);
                }

                done();
            }).catch(done);
        });

        it('uses the passed in config file location', function (done) {
            // We actually want the real method here.
            readFileStub.restore();

            config.read(path.join(originalConfig.paths.appRoot, 'config.example.js')).then(function (cfg) {
                cfg.url.should.equal(defaultConfig.url);
                cfg.database.client.should.equal(defaultConfig.database.client);
                if (defaultConfig.database.client === 'sqlite3') {
                    cfg.database.connection.filename.should.eql(defaultConfig.database.connection.filename);
                } else {
                    cfg.database.connection.host.should.eql(defaultConfig.database.connection.host);
                    cfg.database.connection.database.should.eql(defaultConfig.database.connection.database);
                    cfg.database.connection.password.should.eql(defaultConfig.database.connection.password);
                    cfg.database.connection.user.should.eql(defaultConfig.database.connection.user);
                }
                done();
            }).catch(done);
        });

        it('creates the config file if one does not exist', function (done) {
                // trick bootstrap into thinking that the config file doesn't exist yet
            var existsStub = sandbox.stub(fs, 'stat', function (file, cb) { return cb(true); }),
                // ensure that the file creation is a stub, the tests shouldn't really create a file
                writeFileStub = sandbox.stub(config, 'writeFile').returns(Promise.resolve()),
                validateStub = sandbox.stub(config, 'validate').returns(Promise.resolve());

            config.read().then(function () {
                existsStub.calledOnce.should.be.true;
                writeFileStub.calledOnce.should.be.true;
                validateStub.calledOnce.should.be.true;
                done();
            }).catch(done);
        });

        it('accepts urls with a valid scheme', function (done) {
            // replace the config file with invalid data
            overrideConfig({url: 'http://testurl.com'});

            config.read().then(function (localConfig) {
                localConfig.url.should.equal('http://testurl.com');

                // Next test
                overrideConfig({url: 'https://testurl.com'});
                return config.read();
            }).then(function (localConfig) {
                localConfig.url.should.equal('https://testurl.com');

                 // Next test
                overrideConfig({url: 'http://testurl.com/blog/'});
                return config.read();
            }).then(function (localConfig) {
                localConfig.url.should.equal('http://testurl.com/blog/');

                 // Next test
                overrideConfig({url: 'http://testurl.com/ghostly/'});
                return config.read();
            }).then(function (localConfig) {
                localConfig.url.should.equal('http://testurl.com/ghostly/');

                done();
            }).catch(done);
        });

        it('rejects a fqdn without a scheme', function (done) {
            overrideConfig({url: 'example.com'});

            config.read().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('rejects a hostname without a scheme', function (done) {
            overrideConfig({url: 'example'});

            config.read().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('rejects a hostname with a scheme', function (done) {
            overrideConfig({url: 'https://example'});

            config.read().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('rejects a url with an unsupported scheme', function (done) {
            overrideConfig({url: 'ftp://example.com'});

            config.read().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('rejects a url with a protocol relative scheme', function (done) {
            overrideConfig({url: '//example.com'});

            config.read().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('does not permit the word ghost as a url path', function (done) {
            overrideConfig({url: 'http://example.com/ghost/'});

            config.read().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('does not permit the word ghost to be a component in a url path', function (done) {
            overrideConfig({url: 'http://example.com/blog/ghost/'});

            config.read().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('does not permit the word ghost to be a component in a url path', function (done) {
            overrideConfig({url: 'http://example.com/ghost/blog/'});

            config.read().then(function () {
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

            config.read().then(function () {
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

            config.read().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('requires server to be present', function (done) {
            overrideConfig({server: false});

            config.read().then(function (localConfig) {
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

            config.read().then(function () {
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

            config.read().then(function () {
                var socketConfig = config.getSocket();

                socketConfig.should.be.an.Object;
                socketConfig.path.should.equal('test');
                socketConfig.permissions.should.equal('666');

                done();
            }).catch(done);
        });

        it('allows server to have a host and a port', function (done) {
            overrideConfig({server: {host: '127.0.0.1', port: '2368'}});

            config.read().then(function (localConfig) {
                should.exist(localConfig);
                localConfig.server.host.should.equal('127.0.0.1');
                localConfig.server.port.should.equal('2368');

                done();
            }).catch(done);
        });

        it('rejects server if there is a host but no port', function (done) {
            overrideConfig({server: {host: '127.0.0.1'}});

            config.read().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('rejects server if there is a port but no host', function (done) {
            overrideConfig({server: {port: '2368'}});

            config.read().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error;

                done();
            }).catch(done);
        });

        it('rejects server if configuration is empty', function (done) {
            overrideConfig({server: {}});

            config.read().then(function () {
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
            config.set('updateCheck', 'foo');
            // Run the test code
            config.checkDeprecated();
            logStub.calledOnce.should.be.true;
            logStub.calledWithMatch(null, 'updateCheck').should.be.false;
            // Future tests: This is important here!
            resetEnvironment();
        });

        it('displays warning when updateCheck exists and is falsy', function () {
            config.set('updateCheck', null);
            // Run the test code
            config.checkDeprecated();

            logStub.calledOnce.should.be.true;

            logStub.calledWithMatch(null, 'updateCheck').should.be.false;

            // Future tests: This is important here!
            resetEnvironment();
        });

        it('displays warning when mail.fromaddress exists and is truthy', function () {
            config.set('mail', {
                fromaddress: 'foo'
            });
            // Run the test code
            config.checkDeprecated();

            logStub.calledOnce.should.be.true;

            logStub.calledWithMatch(null, 'mail.fromaddress').should.be.false;

            // Future tests: This is important here!
            resetEnvironment();
        });

        it('displays warning when mail.fromaddress exists and is falsy', function () {
            config.set('mail', {
                fromaddress: undefined
            });
            // Run the test code
            config.checkDeprecated();

            logStub.calledOnce.should.be.true;
            logStub.calledWithMatch(null, 'mail.fromaddress').should.be.false;

            // Future tests: This is important here!
            resetEnvironment();
        });

        it('doesn\'t display warning when only part of a deprecated option is set', function () {
            config.set('mail', {
                notfromaddress: 'foo'
            });

            config.checkDeprecated();
            logStub.calledOnce.should.be.false;

            // Future tests: This is important here!
            resetEnvironment();
        });

        it('can not modify the deprecatedItems on the config object', function () {
            config.set('deprecatedItems', ['foo']);

            config.get('deprecatedItems').should.not.equal(['foo']);
            resetEnvironment();
        });
    });
});
