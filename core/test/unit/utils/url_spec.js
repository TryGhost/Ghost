// jshint unused: false
var should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    moment = require('moment-timezone'),
    utils = require('../../../server/utils'),
    settingsCache = require('../../../server/settings/cache'),
    configUtils = require('../../utils/configUtils'),
    testUtils = require('../../utils'),
    config = configUtils.config,

    sandbox = sinon.sandbox.create();

describe('Url', function () {
    before(function () {
        configUtils.restore();
    });

    afterEach(function () {
        configUtils.restore();
        sandbox.restore();
    });

    describe('getProtectedSlugs', function () {
        it('defaults', function () {
            utils.url.getProtectedSlugs().should.eql(['ghost', 'rss', 'amp']);
        });

        it('url has subdir', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            utils.url.getProtectedSlugs().should.eql(['ghost', 'rss', 'amp', 'blog']);
        });
    });

    describe('getSubdir', function () {
        it('url has no subdir', function () {
            utils.url.getSubdir().should.eql('');
        });

        it('url has subdir', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            utils.url.getSubdir().should.eql('/blog');

            configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
            utils.url.getSubdir().should.eql('/blog');

            configUtils.set({url: 'http://my-ghost-blog.com/my/blog'});
            utils.url.getSubdir().should.eql('/my/blog');

            configUtils.set({url: 'http://my-ghost-blog.com/my/blog/'});
            utils.url.getSubdir().should.eql('/my/blog');
        });

        it('should not return a slash for subdir', function () {
            configUtils.set({url: 'http://my-ghost-blog.com'});
            utils.url.getSubdir().should.eql('');

            configUtils.set({url: 'http://my-ghost-blog.com/'});
            utils.url.getSubdir().should.eql('');
        });
    });

    describe('urlJoin', function () {
        it('should deduplicate slashes', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/'});
            utils.url.urlJoin('/', '/my/', '/blog/').should.equal('/my/blog/');
            utils.url.urlJoin('/', '//my/', '/blog/').should.equal('/my/blog/');
            utils.url.urlJoin('/', '/', '/').should.equal('/');
        });

        it('should not deduplicate slashes in protocol', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/'});
            utils.url.urlJoin('http://myurl.com', '/rss').should.equal('http://myurl.com/rss');
            utils.url.urlJoin('https://myurl.com/', '/rss').should.equal('https://myurl.com/rss');
        });

        it('should permit schemeless protocol', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/'});
            utils.url.urlJoin('/', '/').should.equal('/');
            utils.url.urlJoin('//myurl.com', '/rss').should.equal('//myurl.com/rss');
            utils.url.urlJoin('//myurl.com/', '/rss').should.equal('//myurl.com/rss');
            utils.url.urlJoin('//myurl.com//', 'rss').should.equal('//myurl.com/rss');
            utils.url.urlJoin('', '//myurl.com', 'rss').should.equal('//myurl.com/rss');
        });

        it('should deduplicate subdir', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            utils.url.urlJoin('blog', 'blog/about').should.equal('blog/about');
            utils.url.urlJoin('blog/', 'blog/about').should.equal('blog/about');
            configUtils.set({url: 'http://my-ghost-blog.com/my/blog'});
            utils.url.urlJoin('my/blog', 'my/blog/about').should.equal('my/blog/about');
            utils.url.urlJoin('my/blog/', 'my/blog/about').should.equal('my/blog/about');
        });
    });

    describe('urlFor', function () {
        it('should return the home url with no options', function () {
            utils.url.urlFor().should.equal('/');
            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            utils.url.urlFor().should.equal('/blog/');
            configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
            utils.url.urlFor().should.equal('/blog/');
        });

        it('should return home url when asked for', function () {
            var testContext = 'home';

            configUtils.set({url: 'http://my-ghost-blog.com'});
            utils.url.urlFor(testContext).should.equal('/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/');
            utils.url.urlFor(testContext, {secure: true}, true).should.equal('https://my-ghost-blog.com/');

            configUtils.set({url: 'http://my-ghost-blog.com/'});
            utils.url.urlFor(testContext).should.equal('/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/');
            utils.url.urlFor(testContext, {secure: true}, true).should.equal('https://my-ghost-blog.com/');

            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            utils.url.urlFor(testContext).should.equal('/blog/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/');
            utils.url.urlFor(testContext, {secure: true}, true).should.equal('https://my-ghost-blog.com/blog/');

            configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
            utils.url.urlFor(testContext).should.equal('/blog/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/');
            utils.url.urlFor(testContext, {secure: true}, true).should.equal('https://my-ghost-blog.com/blog/');

            // Output blog url without trailing slash
            configUtils.set({url: 'http://my-ghost-blog.com'});
            utils.url.urlFor(testContext).should.equal('/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/');
            utils.url.urlFor(testContext, {secure: true, trailingSlash: false}, true).should.equal('https://my-ghost-blog.com');

            configUtils.set({url: 'http://my-ghost-blog.com/'});
            utils.url.urlFor(testContext).should.equal('/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/');
            utils.url.urlFor(testContext, {secure: true, trailingSlash: false}, true).should.equal('https://my-ghost-blog.com');

            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            utils.url.urlFor(testContext).should.equal('/blog/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/');
            utils.url.urlFor(testContext, {secure: true, trailingSlash: false}, true).should.equal('https://my-ghost-blog.com/blog');

            configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
            utils.url.urlFor(testContext).should.equal('/blog/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/');
            utils.url.urlFor(testContext, {secure: true, trailingSlash: false}, true).should.equal('https://my-ghost-blog.com/blog');
        });

        it('should return rss url when asked for', function () {
            var testContext = 'rss';

            configUtils.set({url: 'http://my-ghost-blog.com'});
            utils.url.urlFor(testContext).should.equal('/rss/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/rss/');

            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            utils.url.urlFor(testContext).should.equal('/blog/rss/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/rss/');
        });

        it('should handle weird cases by always returning /', function () {
            utils.url.urlFor('').should.equal('/');
            utils.url.urlFor('post', {}).should.equal('/');
            utils.url.urlFor('post', {post: {}}).should.equal('/');
            utils.url.urlFor(null).should.equal('/');
            utils.url.urlFor(undefined).should.equal('/');
            utils.url.urlFor({}).should.equal('/');
            utils.url.urlFor({relativeUrl: ''}).should.equal('/');
            utils.url.urlFor({relativeUrl: null}).should.equal('/');
            utils.url.urlFor({relativeUrl: undefined}).should.equal('/');
        });

        it('should return url for a random path when asked for', function () {
            var testContext = {relativeUrl: '/about/'};

            configUtils.set({url: 'http://my-ghost-blog.com'});
            utils.url.urlFor(testContext).should.equal('/about/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/about/');

            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            utils.url.urlFor(testContext).should.equal('/blog/about/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');
        });

        it('should deduplicate subdirectories in paths', function () {
            var testContext = {relativeUrl: '/blog/about/'};

            configUtils.set({url: 'http://my-ghost-blog.com'});
            utils.url.urlFor(testContext).should.equal('/blog/about/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');

            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            utils.url.urlFor(testContext).should.equal('/blog/about/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');

            configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
            utils.url.urlFor(testContext).should.equal('/blog/about/');
            utils.url.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');
        });

        it('should return url for a post from post object', function () {
            var testContext = 'post',
                testData = {post: _.cloneDeep(testUtils.DataGenerator.Content.posts[2])};

            // url is now provided on the postmodel, permalinkSetting tests are in the model_post_spec.js test
            testData.post.url = '/short-and-sweet/';
            configUtils.set({url: 'http://my-ghost-blog.com'});
            utils.url.urlFor(testContext, testData).should.equal('/short-and-sweet/');
            utils.url.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/short-and-sweet/');

            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            utils.url.urlFor(testContext, testData).should.equal('/blog/short-and-sweet/');
            utils.url.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/short-and-sweet/');

            testData.post.url = '/blog-one/';
            utils.url.urlFor(testContext, testData).should.equal('/blog/blog-one/');
            utils.url.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/blog-one/');
        });

        it('should return url for a tag when asked for', function () {
            var testContext = 'tag',
                testData = {tag: testUtils.DataGenerator.Content.tags[0]};

            configUtils.set({url: 'http://my-ghost-blog.com'});
            utils.url.urlFor(testContext, testData).should.equal('/tag/kitchen-sink/');
            utils.url.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/tag/kitchen-sink/');

            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            utils.url.urlFor(testContext, testData).should.equal('/blog/tag/kitchen-sink/');
            utils.url.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/tag/kitchen-sink/');
        });

        it('should return url for an author when asked for', function () {
            var testContext = 'author',
                testData = {author: testUtils.DataGenerator.Content.users[0]};

            configUtils.set({url: 'http://my-ghost-blog.com'});
            utils.url.urlFor(testContext, testData).should.equal('/author/joe-bloggs/');
            utils.url.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/author/joe-bloggs/');

            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            utils.url.urlFor(testContext, testData).should.equal('/blog/author/joe-bloggs/');
            utils.url.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/author/joe-bloggs/');
        });

        it('should return url for an image when asked for', function () {
            var testContext = 'image',
                testData;

            configUtils.set({url: 'http://my-ghost-blog.com'});

            testData = {image: '/content/images/my-image.jpg'};
            utils.url.urlFor(testContext, testData).should.equal('/content/images/my-image.jpg');
            utils.url.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/content/images/my-image.jpg');

            testData = {image: 'http://placekitten.com/500/200'};
            utils.url.urlFor(testContext, testData).should.equal('http://placekitten.com/500/200');
            utils.url.urlFor(testContext, testData, true).should.equal('http://placekitten.com/500/200');

            testData = {image: '/blog/content/images/my-image2.jpg'};
            utils.url.urlFor(testContext, testData).should.equal('/blog/content/images/my-image2.jpg');
            // We don't make image urls absolute if they don't look like images relative to the image path
            utils.url.urlFor(testContext, testData, true).should.equal('/blog/content/images/my-image2.jpg');

            configUtils.set({url: 'http://my-ghost-blog.com/blog/'});

            testData = {image: '/content/images/my-image3.jpg'};
            utils.url.urlFor(testContext, testData).should.equal('/content/images/my-image3.jpg');
            // We don't make image urls absolute if they don't look like images relative to the image path
            utils.url.urlFor(testContext, testData, true).should.equal('/content/images/my-image3.jpg');

            testData = {image: '/blog/content/images/my-image4.jpg'};
            utils.url.urlFor(testContext, testData).should.equal('/blog/content/images/my-image4.jpg');
            utils.url.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/content/images/my-image4.jpg');

            // Test case for blogs with optional https -
            // they may be configured with http url but the actual connection may be over https (#8373)
            configUtils.set({url: 'http://my-ghost-blog.com'});
            testData = {image: '/content/images/my-image.jpg', secure: true};
            utils.url.urlFor(testContext, testData, true).should.equal('https://my-ghost-blog.com/content/images/my-image.jpg');
        });

        it('should return a url for a nav item when asked for it', function () {
            var testContext = 'nav',
                testData;

            configUtils.set({url: 'http://my-ghost-blog.com'});

            testData = {nav: {url: 'http://my-ghost-blog.com/'}};
            utils.url.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com/');

            testData = {nav: {url: 'http://my-ghost-blog.com/short-and-sweet/'}};
            utils.url.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com/short-and-sweet/');

            testData = {nav: {url: 'http://my-ghost-blog.com//short-and-sweet/'}, secure: true};
            utils.url.urlFor(testContext, testData).should.equal('https://my-ghost-blog.com/short-and-sweet/');

            testData = {nav: {url: 'http://my-ghost-blog.com:3000/'}};
            utils.url.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com:3000/');

            testData = {nav: {url: 'http://my-ghost-blog.com:3000/short-and-sweet/'}};
            utils.url.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com:3000/short-and-sweet/');

            testData = {nav: {url: 'http://sub.my-ghost-blog.com/'}};
            utils.url.urlFor(testContext, testData).should.equal('http://sub.my-ghost-blog.com/');

            testData = {nav: {url: '//sub.my-ghost-blog.com/'}};
            utils.url.urlFor(testContext, testData).should.equal('//sub.my-ghost-blog.com/');

            testData = {nav: {url: 'mailto:sub@my-ghost-blog.com/'}};
            utils.url.urlFor(testContext, testData).should.equal('mailto:sub@my-ghost-blog.com/');

            testData = {nav: {url: '#this-anchor'}};
            utils.url.urlFor(testContext, testData).should.equal('#this-anchor');

            testData = {nav: {url: 'http://some-external-page.com/my-ghost-blog.com'}};
            utils.url.urlFor(testContext, testData).should.equal('http://some-external-page.com/my-ghost-blog.com');

            testData = {nav: {url: 'http://some-external-page.com/stuff-my-ghost-blog.com-around'}};
            utils.url.urlFor(testContext, testData).should.equal('http://some-external-page.com/stuff-my-ghost-blog.com-around');

            testData = {nav: {url: 'mailto:marshmallow@my-ghost-blog.com'}};
            utils.url.urlFor(testContext, testData).should.equal('mailto:marshmallow@my-ghost-blog.com');

            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            testData = {nav: {url: 'http://my-ghost-blog.com/blog/'}};
            utils.url.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com/blog/');

            testData = {nav: {url: 'http://my-ghost-blog.com/blog/short-and-sweet/'}};
            utils.url.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com/blog/short-and-sweet/');

            testData = {nav: {url: 'http://my-ghost-blog.com:3000/blog/'}};
            utils.url.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com:3000/blog/');

            testData = {nav: {url: 'http://my-ghost-blog.com:3000/blog/short-and-sweet/'}};
            utils.url.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com:3000/blog/short-and-sweet/');

            testData = {nav: {url: 'http://sub.my-ghost-blog.com/blog/'}};
            utils.url.urlFor(testContext, testData).should.equal('http://sub.my-ghost-blog.com/blog/');

            testData = {nav: {url: '//sub.my-ghost-blog.com/blog/'}};
            utils.url.urlFor(testContext, testData).should.equal('//sub.my-ghost-blog.com/blog/');
        });

        it('sitemap: should return other known paths when requested', function () {
            configUtils.set({url: 'http://my-ghost-blog.com'});
            utils.url.urlFor('sitemap_xsl').should.equal('/sitemap.xsl');
            utils.url.urlFor('sitemap_xsl', true).should.equal('http://my-ghost-blog.com/sitemap.xsl');
        });

        it('admin: relative', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com'
            });

            utils.url.urlFor('admin').should.equal('/ghost/');
        });

        it('admin: url is http', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com'
            });

            utils.url.urlFor('admin', true).should.equal('http://my-ghost-blog.com/ghost/');
        });

        it('admin: custom admin url is set', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com',
                admin: {
                    url: 'https://admin.my-ghost-blog.com'
                }
            });

            utils.url.urlFor('admin', true).should.equal('https://admin.my-ghost-blog.com/ghost/');
        });

        it('admin: blog is on subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog'
            });

            utils.url.urlFor('admin', true).should.equal('http://my-ghost-blog.com/blog/ghost/');
        });

        it('admin: blog is on subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog/'
            });

            utils.url.urlFor('admin', true).should.equal('http://my-ghost-blog.com/blog/ghost/');
        });

        it('admin: blog is on subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog'
            });

            utils.url.urlFor('admin').should.equal('/blog/ghost/');
        });

        it('admin: blog is on subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog',
                admin: {
                    url: 'http://something.com'
                }
            });

            utils.url.urlFor('admin', true).should.equal('http://something.com/blog/ghost/');
        });

        it('admin: blog is on subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog',
                admin: {
                    url: 'http://something.com/blog'
                }
            });

            utils.url.urlFor('admin', true).should.equal('http://something.com/blog/ghost/');
        });

        it('admin: blog is on subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog',
                admin: {
                    url: 'http://something.com/blog/'
                }
            });

            utils.url.urlFor('admin', true).should.equal('http://something.com/blog/ghost/');
        });

        it('admin: blog is on subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog/',
                admin: {
                    url: 'http://something.com/blog'
                }
            });

            utils.url.urlFor('admin', true).should.equal('http://something.com/blog/ghost/');
        });

        it('api: should return admin url is set', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com',
                admin: {
                    url: 'https://something.de'
                }
            });

            utils.url.urlFor('api', true).should.eql('https://something.de/ghost/api/v0.1/');
        });

        it('api: url has subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog'
            });

            utils.url.urlFor('api', true).should.eql('http://my-ghost-blog.com/blog/ghost/api/v0.1/');
        });

        it('api: relative path is correct', function () {
            utils.url.urlFor('api').should.eql('/ghost/api/v0.1/');
        });

        it('api: relative path with subdir is correct', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog'
            });

            utils.url.urlFor('api').should.eql('/blog/ghost/api/v0.1/');
        });

        it('api: should return http if config.url is http', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com'
            });

            utils.url.urlFor('api', true).should.eql('http://my-ghost-blog.com/ghost/api/v0.1/');
        });

        it('api: should return https if config.url is https', function () {
            configUtils.set({
                url: 'https://my-ghost-blog.com'
            });

            utils.url.urlFor('api', true).should.eql('https://my-ghost-blog.com/ghost/api/v0.1/');
        });

        it('api: with cors, blog url is http: should return no protocol', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com'
            });

            utils.url.urlFor('api', {cors: true}, true).should.eql('//my-ghost-blog.com/ghost/api/v0.1/');
        });

        it('api: with cors, admin url is http: cors should return no protocol', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com',
                admin: {
                    url: 'http://admin.ghost.example'
                }
            });

            utils.url.urlFor('api', {cors: true}, true).should.eql('//admin.ghost.example/ghost/api/v0.1/');
        });

        it('api: with cors, admin url is https: should return with protocol', function () {
            configUtils.set({
                url: 'https://my-ghost-blog.com',
                admin: {
                    url: 'https://admin.ghost.example'
                }
            });

            utils.url.urlFor('api', {cors: true}, true).should.eql('https://admin.ghost.example/ghost/api/v0.1/');
        });

        it('api: with cors, blog url is https: should return with protocol', function () {
            configUtils.set({
                url: 'https://my-ghost-blog.com'
            });

            utils.url.urlFor('api', {cors: true}, true).should.eql('https://my-ghost-blog.com/ghost/api/v0.1/');
        });
    });

    describe('urlPathForPost', function () {
        var localSettingsCache = {
            permalinks: '/:slug/'
        };

        beforeEach(function () {
            sandbox.stub(settingsCache, 'get', function (key) {
                return localSettingsCache[key];
            });
        });

        it('permalink is /:slug/, timezone is default', function () {
            var testData = testUtils.DataGenerator.Content.posts[2],
                postLink = '/short-and-sweet/';

            utils.url.urlPathForPost(testData).should.equal(postLink);
        });

        it('permalink is /:year/:month/:day/:slug, blog timezone is Los Angeles', function () {
            localSettingsCache.active_timezone = 'America/Los_Angeles';
            localSettingsCache.permalinks = '/:year/:month/:day/:slug/';

            var testData = testUtils.DataGenerator.Content.posts[2],
                postLink = '/2016/05/17/short-and-sweet/';

            testData.published_at = new Date('2016-05-18T06:30:00.000Z');
            utils.url.urlPathForPost(testData).should.equal(postLink);
        });

        it('permalink is /:year/:month/:day/:slug, blog timezone is Asia Tokyo', function () {
            localSettingsCache.active_timezone = 'Asia/Tokyo';
            localSettingsCache.permalinks = '/:year/:month/:day/:slug/';

            var testData = testUtils.DataGenerator.Content.posts[2],
                postLink = '/2016/05/18/short-and-sweet/';

            testData.published_at = new Date('2016-05-18T06:30:00.000Z');
            utils.url.urlPathForPost(testData).should.equal(postLink);
        });

        it('post is page, no permalink usage allowed at all', function () {
            localSettingsCache.active_timezone = 'America/Los_Angeles';
            localSettingsCache.permalinks = '/:year/:month/:day/:slug/';

            var testData = testUtils.DataGenerator.Content.posts[5],
                postLink = '/static-page-test/';

            utils.url.urlPathForPost(testData).should.equal(postLink);
        });

        it('permalink is /:year/:id:/:author', function () {
            localSettingsCache.active_timezone = 'America/Los_Angeles';
            localSettingsCache.permalinks = '/:year/:id/:author/';

            var testData = _.merge({}, testUtils.DataGenerator.Content.posts[2], {id: 3}, {author: {slug: 'joe-blog'}}),
                postLink = '/2015/3/joe-blog/';

            testData.published_at = new Date('2016-01-01T00:00:00.000Z');
            utils.url.urlPathForPost(testData).should.equal(postLink);
        });

        it('permalink is /:year/:id:/:author', function () {
            localSettingsCache.active_timezone = 'Europe/Berlin';
            localSettingsCache.permalinks = '/:year/:id/:author/';

            var testData = _.merge({}, testUtils.DataGenerator.Content.posts[2], {id: 3}, {author: {slug: 'joe-blog'}}),
                postLink = '/2016/3/joe-blog/';

            testData.published_at = new Date('2016-01-01T00:00:00.000Z');
            utils.url.urlPathForPost(testData).should.equal(postLink);
        });

        it('permalink is /:primary_tag/:slug/ and there is a primary_tag', function () {
            localSettingsCache.active_timezone = 'Europe/Berlin';
            localSettingsCache.permalinks = '/:primary_tag/:slug/';

            var testData = _.merge({}, testUtils.DataGenerator.Content.posts[2], {primary_tag: {slug: 'bitcoin'}}),
                postLink = '/bitcoin/short-and-sweet/';

            testData.published_at = new Date('2016-01-01T00:00:00.000Z');
            utils.url.urlPathForPost(testData).should.equal(postLink);
        });

        it('permalink is /:primary_tag/:slug/ and there is NO primary_tag', function () {
            localSettingsCache.active_timezone = 'Europe/Berlin';
            localSettingsCache.permalinks = '/:primary_tag/:slug/';

            var testData = testUtils.DataGenerator.Content.posts[2],
                postLink = '/all/short-and-sweet/';

            testData.published_at = new Date('2016-01-01T00:00:00.000Z');
            utils.url.urlPathForPost(testData).should.equal(postLink);
        });

        it('shows "undefined" for unknown route segments', function () {
            localSettingsCache.active_timezone = 'Europe/Berlin';
            localSettingsCache.permalinks = '/:tag/:slug/';

            var testData = testUtils.DataGenerator.Content.posts[2],
                // @TODO: is this the correct behaviour?
                postLink = '/undefined/short-and-sweet/';

            testData.published_at = new Date('2016-01-01T00:00:00.000Z');
            utils.url.urlPathForPost(testData).should.equal(postLink);
        });

        it('post is not published yet', function () {
            localSettingsCache.active_timezone = 'Europe/London';
            localSettingsCache.permalinks = '/:year/:month/:day/:slug/';

            var testData = _.merge(testUtils.DataGenerator.Content.posts[2], {id: 3, published_at: null}),
                nowMoment = moment().tz('Europe/London'),
                postLink = '/YYYY/MM/DD/short-and-sweet/';

            postLink = postLink.replace('YYYY', nowMoment.format('YYYY'));
            postLink = postLink.replace('MM', nowMoment.format('MM'));
            postLink = postLink.replace('DD', nowMoment.format('DD'));

            utils.url.urlPathForPost(testData).should.equal(postLink);
        });
    });

    describe('isSSL', function () {
       it('detects https protocol correctly', function () {
           utils.url.isSSL('https://my.blog.com').should.be.true();
           utils.url.isSSL('http://my.blog.com').should.be.false();
           utils.url.isSSL('http://my.https.com').should.be.false();
       });
    });

    describe('redirects', function () {
        it('performs 301 redirect correctly', function (done) {
            var res = {};

            res.set = sinon.spy();

            res.redirect = function (code, path) {
                code.should.equal(301);
                path.should.eql('my/awesome/path');
                res.set.calledWith({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S}).should.be.true();

                done();
            };

            utils.url.redirect301(res, 'my/awesome/path');
        });

        it('performs an admin 301 redirect correctly', function (done) {
            var res = {};

            res.set = sinon.spy();

            res.redirect = function (code, path) {
                code.should.equal(301);
                path.should.eql('/ghost/#/my/awesome/path/');
                res.set.calledWith({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S}).should.be.true();

                done();
            };

            utils.url.redirectToAdmin(301, res, '#/my/awesome/path');
        });

        it('performs an admin 302 redirect correctly', function (done) {
            var res = {};

            res.set = sinon.spy();

            res.redirect = function (path) {
                path.should.eql('/ghost/#/my/awesome/path/');
                res.set.called.should.be.false();

                done();
            };

            utils.url.redirectToAdmin(302, res, '#/my/awesome/path');
        });
    });
});
