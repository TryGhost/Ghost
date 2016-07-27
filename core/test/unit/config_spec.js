var should         = require('should'),
    sinon          = require('sinon'),
    Promise        = require('bluebird'),
    moment         = require('moment'),
    path           = require('path'),
    fs             = require('fs'),
    _              = require('lodash'),

    testUtils      = require('../utils'),
    i18n           = require('../../server/i18n'),
    /*jshint unused:false*/
    db             = require('../../server/data/db/connection'),

    // Thing we are testing
    configUtils    = require('../utils/configUtils'),
    config         = configUtils.config,
    // storing current environment
    currentEnv     = process.env.NODE_ENV;

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
                    cover: 'casper'
                }
            });
        });

        it('should have exactly the right keys', function () {
            var themeConfig = config.theme;

            // This will fail if there are any extra keys
            themeConfig.should.have.keys('url', 'title', 'description', 'logo', 'cover', 'timezone');
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
        it('should have exactly the right keys', function () {
            var pathConfig = config.paths;

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
                'internalAppPath',
                'imagesPath',
                'imagesRelPath',
                'adminViews',
                'helperTemplates',
                'availableThemes',
                'availableApps',
                'clientAssets'
            );
        });

        it('should have the correct values for each key', function () {
            var pathConfig = config.paths,
                appRoot = path.resolve(__dirname, '../../../');

            pathConfig.should.have.property('appRoot', appRoot);
            pathConfig.should.have.property('subdir', '');
        });

        it('should not return a slash for subdir', function () {
            configUtils.set({url: 'http://my-ghost-blog.com'});
            config.paths.should.have.property('subdir', '');

            configUtils.set({url: 'http://my-ghost-blog.com/'});
            config.paths.should.have.property('subdir', '');
        });

        it('should handle subdirectories properly', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            config.paths.should.have.property('subdir', '/blog');

            configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
            config.paths.should.have.property('subdir', '/blog');

            configUtils.set({url: 'http://my-ghost-blog.com/my/blog'});
            config.paths.should.have.property('subdir', '/my/blog');

            configUtils.set({url: 'http://my-ghost-blog.com/my/blog/'});
            config.paths.should.have.property('subdir', '/my/blog');
        });

        it('should add subdir to list of protected slugs', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            config.slugs.protected.should.containEql('blog');

            configUtils.set({url: 'http://my-ghost-blog.com/my/blog'});
            config.slugs.protected.should.containEql('blog');
        });

        it('should allow specific properties to be user defined', function () {
            var contentPath = path.join(config.paths.appRoot, 'otherContent', '/'),
                configFile = 'configFileDanceParty.js';

            configUtils.set({
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

    describe('Storage', function () {
        it('should default to local-file-store', function () {
            var storagePath = path.join(config.paths.corePath, '/server/storage/', 'local-file-store');

            config.paths.should.have.property('storage', storagePath);
            config.storage.should.have.property('active', 'local-file-store');
        });

        it('should allow setting a custom active storage', function () {
            var storagePath = path.join(config.paths.contentPath, 'storage', 's3');

            configUtils.set({
                storage: {
                    active: 's3',
                    s3: {}
                }
            });

            config.paths.should.have.property('storage', storagePath);
            config.storage.should.have.property('active', 's3');
            config.storage.should.have.property('s3', {});
        });
    });

    describe('Url', function () {
        describe('urlJoin', function () {
            it('should deduplicate slashes', function () {
                configUtils.set({url: 'http://my-ghost-blog.com/'});
                config.urlJoin('/', '/my/', '/blog/').should.equal('/my/blog/');
                config.urlJoin('/', '//my/', '/blog/').should.equal('/my/blog/');
                config.urlJoin('/', '/', '/').should.equal('/');
            });

            it('should not deduplicate slashes in protocol', function () {
                configUtils.set({url: 'http://my-ghost-blog.com/'});
                config.urlJoin('http://myurl.com', '/rss').should.equal('http://myurl.com/rss');
                config.urlJoin('https://myurl.com/', '/rss').should.equal('https://myurl.com/rss');
            });

            it('should permit schemeless protocol', function () {
                configUtils.set({url: 'http://my-ghost-blog.com/'});
                config.urlJoin('/', '/').should.equal('/');
                config.urlJoin('//myurl.com', '/rss').should.equal('//myurl.com/rss');
                config.urlJoin('//myurl.com/', '/rss').should.equal('//myurl.com/rss');
                config.urlJoin('//myurl.com//', 'rss').should.equal('//myurl.com/rss');
                config.urlJoin('', '//myurl.com', 'rss').should.equal('//myurl.com/rss');
            });

            it('should deduplicate subdir', function () {
                configUtils.set({url: 'http://my-ghost-blog.com/blog'});
                config.urlJoin('blog', 'blog/about').should.equal('blog/about');
                config.urlJoin('blog/', 'blog/about').should.equal('blog/about');
                configUtils.set({url: 'http://my-ghost-blog.com/my/blog'});
                config.urlJoin('my/blog', 'my/blog/about').should.equal('my/blog/about');
                config.urlJoin('my/blog/', 'my/blog/about').should.equal('my/blog/about');
            });
        });

        describe('urlFor', function () {
            it('should return the home url with no options', function () {
                config.urlFor().should.equal('/');
                configUtils.set({url: 'http://my-ghost-blog.com/blog'});
                config.urlFor().should.equal('/blog/');
                configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
                config.urlFor().should.equal('/blog/');
            });

            it('should return home url when asked for', function () {
                var testContext = 'home';

                configUtils.set({url: 'http://my-ghost-blog.com'});
                config.urlFor(testContext).should.equal('/');
                config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/');

                configUtils.set({url: 'http://my-ghost-blog.com/'});
                config.urlFor(testContext).should.equal('/');
                config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/');

                configUtils.set({url: 'http://my-ghost-blog.com/blog'});
                config.urlFor(testContext).should.equal('/blog/');
                config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/');

                configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
                config.urlFor(testContext).should.equal('/blog/');
                config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/');
            });

            it('should return rss url when asked for', function () {
                var testContext = 'rss';

                configUtils.set({url: 'http://my-ghost-blog.com'});
                config.urlFor(testContext).should.equal('/rss/');
                config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/rss/');

                configUtils.set({url: 'http://my-ghost-blog.com/blog'});
                config.urlFor(testContext).should.equal('/blog/rss/');
                config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/rss/');
            });

            it('should return url for a random path when asked for', function () {
                var testContext = {relativeUrl: '/about/'};

                configUtils.set({url: 'http://my-ghost-blog.com'});
                config.urlFor(testContext).should.equal('/about/');
                config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/about/');

                configUtils.set({url: 'http://my-ghost-blog.com/blog'});
                config.urlFor(testContext).should.equal('/blog/about/');
                config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');
            });

            it('should deduplicate subdirectories in paths', function () {
                var testContext = {relativeUrl: '/blog/about/'};

                configUtils.set({url: 'http://my-ghost-blog.com'});
                config.urlFor(testContext).should.equal('/blog/about/');
                config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');

                configUtils.set({url: 'http://my-ghost-blog.com/blog'});
                config.urlFor(testContext).should.equal('/blog/about/');
                config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');

                configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
                config.urlFor(testContext).should.equal('/blog/about/');
                config.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');
            });

            it('should return url for a post from post object', function () {
                var testContext = 'post',
                    testData = {post: _.cloneDeep(testUtils.DataGenerator.Content.posts[2])};

                // url is now provided on the postmodel, permalinkSetting tests are in the model_post_spec.js test
                testData.post.url = '/short-and-sweet/';
                configUtils.set({url: 'http://my-ghost-blog.com'});
                config.urlFor(testContext, testData).should.equal('/short-and-sweet/');
                config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/short-and-sweet/');

                configUtils.set({url: 'http://my-ghost-blog.com/blog'});
                config.urlFor(testContext, testData).should.equal('/blog/short-and-sweet/');
                config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/short-and-sweet/');

                testData.post.url = '/blog-one/';
                config.urlFor(testContext, testData).should.equal('/blog/blog-one/');
                config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/blog-one/');
            });

            it('should return url for a tag when asked for', function () {
                var testContext = 'tag',
                    testData = {tag: testUtils.DataGenerator.Content.tags[0]};

                configUtils.set({url: 'http://my-ghost-blog.com'});
                config.urlFor(testContext, testData).should.equal('/tag/kitchen-sink/');
                config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/tag/kitchen-sink/');

                configUtils.set({url: 'http://my-ghost-blog.com/blog'});
                config.urlFor(testContext, testData).should.equal('/blog/tag/kitchen-sink/');
                config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/tag/kitchen-sink/');
            });

            it('should return url for an author when asked for', function () {
                var testContext = 'author',
                    testData = {author: testUtils.DataGenerator.Content.users[0]};

                configUtils.set({url: 'http://my-ghost-blog.com'});
                config.urlFor(testContext, testData).should.equal('/author/joe-bloggs/');
                config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/author/joe-bloggs/');

                configUtils.set({url: 'http://my-ghost-blog.com/blog'});
                config.urlFor(testContext, testData).should.equal('/blog/author/joe-bloggs/');
                config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/author/joe-bloggs/');
            });

            it('should return url for an image when asked for', function () {
                var testContext = 'image',
                    testData;

                configUtils.set({url: 'http://my-ghost-blog.com'});

                testData = {image: '/content/images/my-image.jpg'};
                config.urlFor(testContext, testData).should.equal('/content/images/my-image.jpg');
                config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/content/images/my-image.jpg');

                testData = {image: 'http://placekitten.com/500/200'};
                config.urlFor(testContext, testData).should.equal('http://placekitten.com/500/200');
                config.urlFor(testContext, testData, true).should.equal('http://placekitten.com/500/200');

                testData = {image: '/blog/content/images/my-image2.jpg'};
                config.urlFor(testContext, testData).should.equal('/blog/content/images/my-image2.jpg');
                // We don't make image urls absolute if they don't look like images relative to the image path
                config.urlFor(testContext, testData, true).should.equal('/blog/content/images/my-image2.jpg');

                configUtils.set({url: 'http://my-ghost-blog.com/blog/'});

                testData = {image: '/content/images/my-image3.jpg'};
                config.urlFor(testContext, testData).should.equal('/content/images/my-image3.jpg');
                // We don't make image urls absolute if they don't look like images relative to the image path
                config.urlFor(testContext, testData, true).should.equal('/content/images/my-image3.jpg');

                testData = {image: '/blog/content/images/my-image4.jpg'};
                config.urlFor(testContext, testData).should.equal('/blog/content/images/my-image4.jpg');
                config.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/content/images/my-image4.jpg');
            });

            it('should return a url for a nav item when asked for it', function () {
                var testContext = 'nav',
                    testData;

                configUtils.set({url: 'http://my-ghost-blog.com', urlSSL: 'https://my-ghost-blog.com'});

                testData = {nav: {url: 'http://my-ghost-blog.com/short-and-sweet/'}};
                config.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com/short-and-sweet/');

                testData = {nav: {url: 'http://my-ghost-blog.com/short-and-sweet/'}, secure: true};
                config.urlFor(testContext, testData).should.equal('https://my-ghost-blog.com/short-and-sweet/');

                testData = {nav: {url: 'http://my-ghost-blog.com:3000/'}};
                config.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com:3000/');

                testData = {nav: {url: 'http://my-ghost-blog.com:3000/short-and-sweet/'}};
                config.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com:3000/short-and-sweet/');

                testData = {nav: {url: 'http://sub.my-ghost-blog.com/'}};
                config.urlFor(testContext, testData).should.equal('http://sub.my-ghost-blog.com/');

                testData = {nav: {url: '//sub.my-ghost-blog.com/'}};
                config.urlFor(testContext, testData).should.equal('//sub.my-ghost-blog.com/');

                testData = {nav: {url: 'mailto:sub@my-ghost-blog.com/'}};
                config.urlFor(testContext, testData).should.equal('mailto:sub@my-ghost-blog.com/');

                testData = {nav: {url: '#this-anchor'}};
                config.urlFor(testContext, testData).should.equal('#this-anchor');

                testData = {nav: {url: 'http://some-external-page.com/my-ghost-blog.com'}};
                config.urlFor(testContext, testData).should.equal('http://some-external-page.com/my-ghost-blog.com');

                testData = {nav: {url: 'http://some-external-page.com/stuff-my-ghost-blog.com-around'}};
                config.urlFor(testContext, testData).should.equal('http://some-external-page.com/stuff-my-ghost-blog.com-around');

                configUtils.set({url: 'http://my-ghost-blog.com/blog'});
                testData = {nav: {url: 'http://my-ghost-blog.com/blog/short-and-sweet/'}};
                config.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com/blog/short-and-sweet/');

                configUtils.set({url: 'http://my-ghost-blog.com/'});
                testData = {nav: {url: 'mailto:marshmallow@my-ghost-blog.com'}};
                config.urlFor(testContext, testData).should.equal('mailto:marshmallow@my-ghost-blog.com');
            });

            it('should return other known paths when requested', function () {
                configUtils.set({url: 'http://my-ghost-blog.com'});
                config.urlFor('sitemap_xsl').should.equal('/sitemap.xsl');
                config.urlFor('sitemap_xsl', true).should.equal('http://my-ghost-blog.com/sitemap.xsl');

                config.urlFor('api').should.equal('/ghost/api/v0.1');
                config.urlFor('api', true).should.equal('http://my-ghost-blog.com/ghost/api/v0.1');
            });
        });

        describe('urlPathForPost', function () {
            it('permalink is /:slug/, timezone is default', function () {
                config.theme.permalinks = '/:slug/';

                var testData = testUtils.DataGenerator.Content.posts[2],
                    postLink = '/short-and-sweet/';

                config.urlPathForPost(testData).should.equal(postLink);
            });

            it('permalink is /:year/:month/:day/:slug, blog timezone is Los Angeles', function () {
                config.theme.timezone = 'America/Los_Angeles';
                config.theme.permalinks = '/:year/:month/:day/:slug/';

                var testData = testUtils.DataGenerator.Content.posts[2],
                    postLink = '/2016/05/17/short-and-sweet/';

                testData.published_at = new Date('2016-05-18T06:30:00.000Z');
                config.urlPathForPost(testData).should.equal(postLink);
            });

            it('permalink is /:year/:month/:day/:slug, blog timezone is Asia Tokyo', function () {
                config.theme.timezone = 'Asia/Tokyo';
                config.theme.permalinks = '/:year/:month/:day/:slug/';

                var testData = testUtils.DataGenerator.Content.posts[2],
                    postLink = '/2016/05/18/short-and-sweet/';

                testData.published_at = new Date('2016-05-18T06:30:00.000Z');
                config.urlPathForPost(testData).should.equal(postLink);
            });

            it('post is page, no permalink usage allowed at all', function () {
                config.theme.timezone = 'America/Los_Angeles';
                config.theme.permalinks = '/:year/:month/:day/:slug/';

                var testData = testUtils.DataGenerator.Content.posts[5],
                    postLink = '/static-page-test/';

                config.urlPathForPost(testData).should.equal(postLink);
            });

            it('permalink is /:year/:id:/:author', function () {
                config.theme.timezone = 'America/Los_Angeles';
                config.theme.permalinks = '/:year/:id/:author/';

                var testData = _.merge(testUtils.DataGenerator.Content.posts[2], {id: 3}, {author: {slug: 'joe-blog'}}),
                    postLink = '/2015/3/joe-blog/';

                testData.published_at = new Date('2016-01-01T00:00:00.000Z');
                config.urlPathForPost(testData).should.equal(postLink);
            });

            it('permalink is /:year/:id:/:author', function () {
                config.theme.timezone = 'Europe/Berlin';
                config.theme.permalinks = '/:year/:id/:author/';

                var testData = _.merge(testUtils.DataGenerator.Content.posts[2], {id: 3}, {author: {slug: 'joe-blog'}}),
                    postLink = '/2016/3/joe-blog/';

                testData.published_at = new Date('2016-01-01T00:00:00.000Z');
                config.urlPathForPost(testData).should.equal(postLink);
            });

            it('post is not published yet', function () {
                config.theme.permalinks = '/:year/:month/:day/:slug/';

                var testData = _.merge(testUtils.DataGenerator.Content.posts[2], {id: 3, published_at: null}),
                    nowMoment = moment(),
                    postLink = '/YYYY/MM/DD/short-and-sweet/';

                postLink = postLink.replace('YYYY', nowMoment.format('YYYY'));
                postLink = postLink.replace('MM', nowMoment.format('MM'));
                postLink = postLink.replace('DD', nowMoment.format('DD'));

                config.urlPathForPost(testData).should.equal(postLink);
            });
        });

        describe('apiUrl', function () {
            it('should return https config.url if forceAdminSSL set', function () {
                configUtils.set({
                    url: 'http://my-ghost-blog.com',
                    forceAdminSSL: true
                });

                config.apiUrl().should.eql('https://my-ghost-blog.com/ghost/api/v0.1/');
            });

            it('should return https config.urlSSL if forceAdminSSL set and urlSSL is misconfigured', function () {
                configUtils.set({
                    url: 'http://my-ghost-blog.com',
                    urlSSL: 'http://other-ghost-blog.com',
                    forceAdminSSL: true
                });

                config.apiUrl().should.eql('https://other-ghost-blog.com/ghost/api/v0.1/');
            });

            it('should return https config.urlSSL if forceAdminSSL set', function () {
                configUtils.set({
                    url: 'http://my-ghost-blog.com',
                    urlSSL: 'https://other-ghost-blog.com',
                    forceAdminSSL: true
                });

                config.apiUrl().should.eql('https://other-ghost-blog.com/ghost/api/v0.1/');
            });

            it('should return https config.urlSSL if set and misconfigured & forceAdminSSL is NOT set', function () {
                configUtils.set({
                    url: 'http://my-ghost-blog.com',
                    urlSSL: 'http://other-ghost-blog.com'
                });

                config.apiUrl().should.eql('https://other-ghost-blog.com/ghost/api/v0.1/');
            });

            it('should return https config.urlSSL if set & forceAdminSSL is NOT set', function () {
                configUtils.set({
                    url: 'http://my-ghost-blog.com',
                    urlSSL: 'https://other-ghost-blog.com'
                });

                config.apiUrl().should.eql('https://other-ghost-blog.com/ghost/api/v0.1/');
            });

            it('should return https config.url if config.url is https & forceAdminSSL is NOT set', function () {
                configUtils.set({
                    url: 'https://my-ghost-blog.com'
                });

                config.apiUrl().should.eql('https://my-ghost-blog.com/ghost/api/v0.1/');
            });

            it('should return no protocol config.url if config.url is NOT https & forceAdminSSL/urlSSL is NOT set', function () {
                configUtils.set({
                    url: 'http://my-ghost-blog.com'
                });

                config.apiUrl().should.eql('//my-ghost-blog.com/ghost/api/v0.1/');
            });
        });
    });

    describe('File', function () {
        var sandbox,
            readFileStub,
            overrideReadFileConfig,
            expectedError = new Error('expected bootstrap() to throw error but none thrown');

        before(function () {
            // Create a function to override what reading the config file returns
            overrideReadFileConfig = function (newConfig) {
                readFileStub.returns(
                    _.extend({}, configUtils.defaultConfig, newConfig)
                );
            };
        });

        beforeEach(function () {
            sandbox = sinon.sandbox.create();
            readFileStub = sandbox.stub(config, 'readFile');
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('loads the config file if one exists', function (done) {
            // We actually want the real method here.
            readFileStub.restore();

            // the test infrastructure is setup so that there is always config present,
            // but we want to overwrite the test to actually load config.example.js, so that any local changes
            // don't break the tests
            configUtils.set({
                paths: {
                    appRoot: path.join(configUtils.defaultConfig.paths.appRoot, 'config.example.js')
                }
            });

            config.load().then(function (config) {
                config.url.should.equal(configUtils.defaultConfig.url);
                config.database.client.should.equal(configUtils.defaultConfig.database.client);

                if (config.database.client === 'sqlite3') {
                    config.database.connection.filename.should.eql(configUtils.defaultConfig.database.connection.filename);
                } else {
                    config.database.connection.charset.should.eql(configUtils.defaultConfig.database.connection.charset);
                    config.database.connection.database.should.eql(configUtils.defaultConfig.database.connection.database);
                    config.database.connection.host.should.eql(configUtils.defaultConfig.database.connection.host);
                    config.database.connection.password.should.eql(configUtils.defaultConfig.database.connection.password);
                    config.database.connection.user.should.eql(configUtils.defaultConfig.database.connection.user);
                }

                config.server.host.should.equal(configUtils.defaultConfig.server.host);
                config.server.port.should.equal(configUtils.defaultConfig.server.port);

                done();
            }).catch(done);
        });

        it('uses the passed in config file location', function (done) {
            // We actually want the real method here.
            readFileStub.restore();

            config.load(path.join(configUtils.defaultConfig.paths.appRoot, 'config.example.js')).then(function (config) {
                config.url.should.equal(configUtils.defaultConfig.url);
                config.database.client.should.equal(configUtils.defaultConfig.database.client);

                if (config.database.client === 'sqlite3') {
                    config.database.connection.filename.should.eql(configUtils.defaultConfig.database.connection.filename);
                } else {
                    config.database.connection.charset.should.eql(configUtils.defaultConfig.database.connection.charset);
                    config.database.connection.database.should.eql(configUtils.defaultConfig.database.connection.database);
                    config.database.connection.host.should.eql(configUtils.defaultConfig.database.connection.host);
                    config.database.connection.password.should.eql(configUtils.defaultConfig.database.connection.password);
                    config.database.connection.user.should.eql(configUtils.defaultConfig.database.connection.user);
                }
                config.server.host.should.equal(configUtils.defaultConfig.server.host);
                config.server.port.should.equal(configUtils.defaultConfig.server.port);

                done();
            }).catch(done);
        });

        it('creates the config file if one does not exist', function (done) {
            // trick bootstrap into thinking that the config file doesn't exist yet
            var existsStub = sandbox.stub(fs, 'stat', function (file, cb) { return cb(true); }),
                // ensure that the file creation is a stub, the tests shouldn't really create a file
                writeFileStub = sandbox.stub(config, 'writeFile').returns(Promise.resolve()),
                validateStub = sandbox.stub(config, 'validate').returns(Promise.resolve());

            config.load().then(function () {
                existsStub.calledOnce.should.be.true();
                writeFileStub.calledOnce.should.be.true();
                validateStub.calledOnce.should.be.true();
                done();
            }).catch(done);
        });

        it('accepts urls with a valid scheme', function (done) {
            // replace the config file with invalid data
            overrideReadFileConfig({url: 'http://testurl.com'});

            config.load().then(function (localConfig) {
                localConfig.url.should.equal('http://testurl.com');

                // Next test
                overrideReadFileConfig({url: 'https://testurl.com'});
                return config.load();
            }).then(function (localConfig) {
                localConfig.url.should.equal('https://testurl.com');

                // Next test
                overrideReadFileConfig({url: 'http://testurl.com/blog/'});
                return config.load();
            }).then(function (localConfig) {
                localConfig.url.should.equal('http://testurl.com/blog/');

                // Next test
                overrideReadFileConfig({url: 'http://testurl.com/ghostly/'});
                return config.load();
            }).then(function (localConfig) {
                localConfig.url.should.equal('http://testurl.com/ghostly/');

                done();
            }).catch(done);
        });

        it('rejects a fqdn without a scheme', function (done) {
            overrideReadFileConfig({url: 'example.com'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('rejects a hostname without a scheme', function (done) {
            overrideReadFileConfig({url: 'example'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('rejects a hostname with a scheme', function (done) {
            overrideReadFileConfig({url: 'https://example'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('rejects a url with an unsupported scheme', function (done) {
            overrideReadFileConfig({url: 'ftp://example.com'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('rejects a url with a protocol relative scheme', function (done) {
            overrideReadFileConfig({url: '//example.com'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('does not permit the word ghost as a url path', function (done) {
            overrideReadFileConfig({url: 'http://example.com/ghost/'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('does not permit the word ghost to be a component in a url path', function (done) {
            overrideReadFileConfig({url: 'http://example.com/blog/ghost/'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('does not permit the word ghost to be a component in a url path', function (done) {
            overrideReadFileConfig({url: 'http://example.com/ghost/blog/'});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('does not permit database config to be falsy', function (done) {
            // replace the config file with invalid data
            overrideReadFileConfig({database: false});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('does not permit database config to be empty', function (done) {
            // replace the config file with invalid data
            overrideReadFileConfig({database: {}});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('requires server to be present', function (done) {
            overrideReadFileConfig({server: false});

            config.load().then(function (localConfig) {
                /*jshint unused:false*/
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('allows server to use a socket', function (done) {
            overrideReadFileConfig({server: {socket: 'test'}});

            config.load().then(function () {
                var socketConfig = config.getSocket();

                socketConfig.should.be.an.Object();
                socketConfig.path.should.equal('test');
                socketConfig.permissions.should.equal('660');

                done();
            }).catch(done);
        });

        it('allows server to use a socket and user-defined permissions', function (done) {
            overrideReadFileConfig({
                server: {
                    socket: {
                        path: 'test',
                        permissions: '666'
                    }
                }
            });

            config.load().then(function () {
                var socketConfig = config.getSocket();

                socketConfig.should.be.an.Object();
                socketConfig.path.should.equal('test');
                socketConfig.permissions.should.equal('666');

                done();
            }).catch(done);
        });

        it('allows server to have a host and a port', function (done) {
            overrideReadFileConfig({server: {host: '127.0.0.1', port: '2368'}});

            config.load().then(function (localConfig) {
                should.exist(localConfig);
                localConfig.server.host.should.equal('127.0.0.1');
                localConfig.server.port.should.equal('2368');

                done();
            }).catch(done);
        });

        it('rejects server if there is a host but no port', function (done) {
            overrideReadFileConfig({server: {host: '127.0.0.1'}});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('rejects server if there is a port but no host', function (done) {
            overrideReadFileConfig({server: {port: '2368'}});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });

        it('rejects server if configuration is empty', function (done) {
            overrideReadFileConfig({server: {}});

            config.load().then(function () {
                done(expectedError);
            }).catch(function (err) {
                should.exist(err);
                err.should.be.an.Error();

                done();
            }).catch(done);
        });
    });

    describe('Check for deprecation messages:', function () {
        var logStub,
            // Can't use afterEach here, because mocha uses console.log to output the checkboxes
            // which we've just stubbed, so we need to restore it before the test ends to see ticks.
            resetEnvironment = function () {
                process.env.NODE_ENV = currentEnv;
            };

        beforeEach(function () {
            logStub = sinon.spy(console, 'log');
            process.env.NODE_ENV = 'development';
        });

        afterEach(function () {
            logStub.restore();
            resetEnvironment();
        });

        it('doesn\'t display warning when deprecated options not set', function () {
            configUtils.config.checkDeprecated();
            logStub.calledOnce.should.be.false();
        });

        it('displays warning when updateCheck exists and is truthy', function () {
            configUtils.set({
                updateCheck: 'foo'
            });
            // Run the test code
            configUtils.config.checkDeprecated();

            logStub.calledOnce.should.be.true();

            logStub.calledWithMatch('updateCheck').should.be.true();
        });

        it('displays warning when updateCheck exists and is falsy', function () {
            configUtils.set({
                updateCheck: false
            });
            // Run the test code
            configUtils.config.checkDeprecated();

            logStub.calledOnce.should.be.true();

            logStub.calledWithMatch('updateCheck').should.be.true();
        });

        it('displays warning when mail.fromaddress exists and is truthy', function () {
            configUtils.set({
                mail: {
                    fromaddress: 'foo'
                }
            });
            // Run the test code
            configUtils.config.checkDeprecated();

            logStub.calledOnce.should.be.true();

            logStub.calledWithMatch('mail.fromaddress').should.be.true();
        });

        it('displays warning when mail.fromaddress exists and is falsy', function () {
            configUtils.set({
                mail: {
                    fromaddress: false
                }
            });
            // Run the test code
            configUtils.config.checkDeprecated();

            logStub.calledOnce.should.be.true();

            logStub.calledWithMatch('mail.fromaddress').should.be.true();
        });

        it('doesn\'t display warning when only part of a deprecated option is set', function () {
            configUtils.set({
                mail: {
                    notfromaddress: 'foo'
                }
            });

            configUtils.config.checkDeprecated();
            logStub.calledOnce.should.be.false();
        });

        it('can not modify the deprecatedItems on the config object', function () {
            configUtils.set({
                deprecatedItems: ['foo']
            });

            configUtils.config.deprecatedItems.should.not.equal(['foo']);
        });
    });
});
