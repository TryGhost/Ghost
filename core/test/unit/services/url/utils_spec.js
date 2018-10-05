const should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    moment = require('moment-timezone'),
    urlService = require('../../../../server/services/url'),
    constants = require('../../../../server/lib/constants'),
    settingsCache = require('../../../../server/services/settings/cache'),
    configUtils = require('../../../utils/configUtils'),
    testUtils = require('../../../utils'),
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

    describe('absoluteToRelative', function () {
        it('default', function () {
            urlService.utils.absoluteToRelative('http://myblog.com/test/').should.eql('/test/');
        });

        it('with subdir', function () {
            urlService.utils.absoluteToRelative('http://myblog.com/blog/test/').should.eql('/blog/test/');
        });

        it('with subdir, but request without', function () {
            configUtils.set('url', 'http://myblog.com/blog/');

            urlService.utils.absoluteToRelative('http://myblog.com/blog/test/', {withoutSubdirectory: true})
                .should.eql('/test/');
        });

        it('with subdir, but request without', function () {
            configUtils.set('url', 'http://myblog.com/blog');

            urlService.utils.absoluteToRelative('http://myblog.com/blog/test/', {withoutSubdirectory: true})
                .should.eql('/test/');
        });
    });

    describe('getProtectedSlugs', function () {
        it('defaults', function () {
            urlService.utils.getProtectedSlugs().should.eql(['ghost', 'rss', 'amp']);
        });

        it('url has subdir', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            urlService.utils.getProtectedSlugs().should.eql(['ghost', 'rss', 'amp', 'blog']);
        });
    });

    describe('getSubdir', function () {
        it('url has no subdir', function () {
            urlService.utils.getSubdir().should.eql('');
        });

        it('url has subdir', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            urlService.utils.getSubdir().should.eql('/blog');

            configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
            urlService.utils.getSubdir().should.eql('/blog');

            configUtils.set({url: 'http://my-ghost-blog.com/my/blog'});
            urlService.utils.getSubdir().should.eql('/my/blog');

            configUtils.set({url: 'http://my-ghost-blog.com/my/blog/'});
            urlService.utils.getSubdir().should.eql('/my/blog');
        });

        it('should not return a slash for subdir', function () {
            configUtils.set({url: 'http://my-ghost-blog.com'});
            urlService.utils.getSubdir().should.eql('');

            configUtils.set({url: 'http://my-ghost-blog.com/'});
            urlService.utils.getSubdir().should.eql('');
        });
    });

    describe('urlJoin', function () {
        it('should deduplicate slashes', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/'});
            urlService.utils.urlJoin('/', '/my/', '/blog/').should.equal('/my/blog/');
            urlService.utils.urlJoin('/', '//my/', '/blog/').should.equal('/my/blog/');
            urlService.utils.urlJoin('/', '/', '/').should.equal('/');
        });

        it('should not deduplicate slashes in protocol', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/'});
            urlService.utils.urlJoin('http://myurl.com', '/rss').should.equal('http://myurl.com/rss');
            urlService.utils.urlJoin('https://myurl.com/', '/rss').should.equal('https://myurl.com/rss');
        });

        it('should permit schemeless protocol', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/'});
            urlService.utils.urlJoin('/', '/').should.equal('/');
            urlService.utils.urlJoin('//myurl.com', '/rss').should.equal('//myurl.com/rss');
            urlService.utils.urlJoin('//myurl.com/', '/rss').should.equal('//myurl.com/rss');
            urlService.utils.urlJoin('//myurl.com//', 'rss').should.equal('//myurl.com/rss');
            urlService.utils.urlJoin('', '//myurl.com', 'rss').should.equal('//myurl.com/rss');
        });

        it('should deduplicate subdir', function () {
            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            urlService.utils.urlJoin('blog', 'blog/about').should.equal('blog/about');
            urlService.utils.urlJoin('blog/', 'blog/about').should.equal('blog/about');
            configUtils.set({url: 'http://my-ghost-blog.com/my/blog'});
            urlService.utils.urlJoin('my/blog', 'my/blog/about').should.equal('my/blog/about');
            urlService.utils.urlJoin('my/blog/', 'my/blog/about').should.equal('my/blog/about');
        });

        it('should handle subdir matching tld', function () {
            configUtils.set({url: 'http://ghost.blog/blog'});
            urlService.utils.urlJoin('ghost.blog/blog', 'ghost/').should.equal('ghost.blog/blog/ghost/');
            urlService.utils.urlJoin('ghost.blog', 'blog', 'ghost/').should.equal('ghost.blog/blog/ghost/');
        });
    });

    describe('urlFor', function () {
        it('should return the home url with no options', function () {
            urlService.utils.urlFor().should.equal('/');
            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            urlService.utils.urlFor().should.equal('/blog/');
            configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
            urlService.utils.urlFor().should.equal('/blog/');
        });

        it('should return home url when asked for', function () {
            var testContext = 'home';

            configUtils.set({url: 'http://my-ghost-blog.com'});
            urlService.utils.urlFor(testContext).should.equal('/');
            urlService.utils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/');
            urlService.utils.urlFor(testContext, {secure: true}, true).should.equal('https://my-ghost-blog.com/');

            configUtils.set({url: 'http://my-ghost-blog.com/'});
            urlService.utils.urlFor(testContext).should.equal('/');
            urlService.utils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/');
            urlService.utils.urlFor(testContext, {secure: true}, true).should.equal('https://my-ghost-blog.com/');

            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            urlService.utils.urlFor(testContext).should.equal('/blog/');
            urlService.utils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/');
            urlService.utils.urlFor(testContext, {secure: true}, true).should.equal('https://my-ghost-blog.com/blog/');

            configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
            urlService.utils.urlFor(testContext).should.equal('/blog/');
            urlService.utils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/');
            urlService.utils.urlFor(testContext, {secure: true}, true).should.equal('https://my-ghost-blog.com/blog/');

            // Output blog url without trailing slash
            configUtils.set({url: 'http://my-ghost-blog.com'});
            urlService.utils.urlFor(testContext).should.equal('/');
            urlService.utils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/');
            urlService.utils.urlFor(testContext, {
                secure: true,
                trailingSlash: false
            }, true).should.equal('https://my-ghost-blog.com');

            configUtils.set({url: 'http://my-ghost-blog.com/'});
            urlService.utils.urlFor(testContext).should.equal('/');
            urlService.utils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/');
            urlService.utils.urlFor(testContext, {
                secure: true,
                trailingSlash: false
            }, true).should.equal('https://my-ghost-blog.com');

            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            urlService.utils.urlFor(testContext).should.equal('/blog/');
            urlService.utils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/');
            urlService.utils.urlFor(testContext, {
                secure: true,
                trailingSlash: false
            }, true).should.equal('https://my-ghost-blog.com/blog');

            configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
            urlService.utils.urlFor(testContext).should.equal('/blog/');
            urlService.utils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/');
            urlService.utils.urlFor(testContext, {
                secure: true,
                trailingSlash: false
            }, true).should.equal('https://my-ghost-blog.com/blog');
        });

        it('should handle weird cases by always returning /', function () {
            urlService.utils.urlFor('').should.equal('/');
            urlService.utils.urlFor('post', {}).should.equal('/');
            urlService.utils.urlFor('post', {post: {}}).should.equal('/');
            urlService.utils.urlFor(null).should.equal('/');
            urlService.utils.urlFor(undefined).should.equal('/');
            urlService.utils.urlFor({}).should.equal('/');
            urlService.utils.urlFor({relativeUrl: ''}).should.equal('/');
            urlService.utils.urlFor({relativeUrl: null}).should.equal('/');
            urlService.utils.urlFor({relativeUrl: undefined}).should.equal('/');
        });

        it('should return url for a random path when asked for', function () {
            var testContext = {relativeUrl: '/about/'};

            configUtils.set({url: 'http://my-ghost-blog.com'});
            urlService.utils.urlFor(testContext).should.equal('/about/');
            urlService.utils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/about/');

            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            urlService.utils.urlFor(testContext).should.equal('/blog/about/');
            urlService.utils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');

            testContext.secure = true;
            urlService.utils.urlFor(testContext, true).should.equal('https://my-ghost-blog.com/blog/about/');

            testContext.secure = false;
            urlService.utils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');

            testContext.secure = false;
            configUtils.set({url: 'https://my-ghost-blog.com'});
            urlService.utils.urlFor(testContext, true).should.equal('https://my-ghost-blog.com/about/');
        });

        it('should deduplicate subdirectories in paths', function () {
            var testContext = {relativeUrl: '/blog/about/'};

            configUtils.set({url: 'http://my-ghost-blog.com'});
            urlService.utils.urlFor(testContext).should.equal('/blog/about/');
            urlService.utils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');

            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            urlService.utils.urlFor(testContext).should.equal('/blog/about/');
            urlService.utils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');

            configUtils.set({url: 'http://my-ghost-blog.com/blog/'});
            urlService.utils.urlFor(testContext).should.equal('/blog/about/');
            urlService.utils.urlFor(testContext, true).should.equal('http://my-ghost-blog.com/blog/about/');
        });

        it('should return url for an image when asked for', function () {
            var testContext = 'image',
                testData;

            configUtils.set({url: 'http://my-ghost-blog.com'});

            testData = {image: '/content/images/my-image.jpg'};
            urlService.utils.urlFor(testContext, testData).should.equal('/content/images/my-image.jpg');
            urlService.utils.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/content/images/my-image.jpg');

            testData = {image: 'http://placekitten.com/500/200'};
            urlService.utils.urlFor(testContext, testData).should.equal('http://placekitten.com/500/200');
            urlService.utils.urlFor(testContext, testData, true).should.equal('http://placekitten.com/500/200');

            testData = {image: '/blog/content/images/my-image2.jpg'};
            urlService.utils.urlFor(testContext, testData).should.equal('/blog/content/images/my-image2.jpg');
            // We don't make image urls absolute if they don't look like images relative to the image path
            urlService.utils.urlFor(testContext, testData, true).should.equal('/blog/content/images/my-image2.jpg');

            configUtils.set({url: 'http://my-ghost-blog.com/blog/'});

            testData = {image: '/content/images/my-image3.jpg'};
            urlService.utils.urlFor(testContext, testData).should.equal('/content/images/my-image3.jpg');
            // We don't make image urls absolute if they don't look like images relative to the image path
            urlService.utils.urlFor(testContext, testData, true).should.equal('/content/images/my-image3.jpg');

            testData = {image: '/blog/content/images/my-image4.jpg'};
            urlService.utils.urlFor(testContext, testData).should.equal('/blog/content/images/my-image4.jpg');
            urlService.utils.urlFor(testContext, testData, true).should.equal('http://my-ghost-blog.com/blog/content/images/my-image4.jpg');

            // Test case for blogs with optional https -
            // they may be configured with http url but the actual connection may be over https (#8373)
            configUtils.set({url: 'http://my-ghost-blog.com'});
            testData = {image: '/content/images/my-image.jpg', secure: true};
            urlService.utils.urlFor(testContext, testData, true).should.equal('https://my-ghost-blog.com/content/images/my-image.jpg');
        });

        it('should return a url for a nav item when asked for it', function () {
            var testContext = 'nav',
                testData;

            configUtils.set({url: 'http://my-ghost-blog.com'});

            testData = {nav: {url: 'http://my-ghost-blog.com/'}};
            urlService.utils.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com/');

            testData = {nav: {url: 'http://my-ghost-blog.com/short-and-sweet/'}};
            urlService.utils.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com/short-and-sweet/');

            testData = {nav: {url: 'http://my-ghost-blog.com//short-and-sweet/'}, secure: true};
            urlService.utils.urlFor(testContext, testData).should.equal('https://my-ghost-blog.com/short-and-sweet/');

            testData = {nav: {url: 'http://my-ghost-blog.com:3000/'}};
            urlService.utils.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com:3000/');

            testData = {nav: {url: 'http://my-ghost-blog.com:3000/short-and-sweet/'}};
            urlService.utils.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com:3000/short-and-sweet/');

            testData = {nav: {url: 'http://sub.my-ghost-blog.com/'}};
            urlService.utils.urlFor(testContext, testData).should.equal('http://sub.my-ghost-blog.com/');

            testData = {nav: {url: '//sub.my-ghost-blog.com/'}};
            urlService.utils.urlFor(testContext, testData).should.equal('//sub.my-ghost-blog.com/');

            testData = {nav: {url: 'mailto:sub@my-ghost-blog.com/'}};
            urlService.utils.urlFor(testContext, testData).should.equal('mailto:sub@my-ghost-blog.com/');

            testData = {nav: {url: '#this-anchor'}};
            urlService.utils.urlFor(testContext, testData).should.equal('#this-anchor');

            testData = {nav: {url: 'http://some-external-page.com/my-ghost-blog.com'}};
            urlService.utils.urlFor(testContext, testData).should.equal('http://some-external-page.com/my-ghost-blog.com');

            testData = {nav: {url: 'http://some-external-page.com/stuff-my-ghost-blog.com-around'}};
            urlService.utils.urlFor(testContext, testData).should.equal('http://some-external-page.com/stuff-my-ghost-blog.com-around');

            testData = {nav: {url: 'mailto:marshmallow@my-ghost-blog.com'}};
            urlService.utils.urlFor(testContext, testData).should.equal('mailto:marshmallow@my-ghost-blog.com');

            configUtils.set({url: 'http://my-ghost-blog.com/blog'});
            testData = {nav: {url: 'http://my-ghost-blog.com/blog/'}};
            urlService.utils.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com/blog/');

            testData = {nav: {url: 'http://my-ghost-blog.com/blog/short-and-sweet/'}};
            urlService.utils.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com/blog/short-and-sweet/');

            testData = {nav: {url: 'http://my-ghost-blog.com:3000/blog/'}};
            urlService.utils.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com:3000/blog/');

            testData = {nav: {url: 'http://my-ghost-blog.com:3000/blog/short-and-sweet/'}};
            urlService.utils.urlFor(testContext, testData).should.equal('http://my-ghost-blog.com:3000/blog/short-and-sweet/');

            testData = {nav: {url: 'http://sub.my-ghost-blog.com/blog/'}};
            urlService.utils.urlFor(testContext, testData).should.equal('http://sub.my-ghost-blog.com/blog/');

            testData = {nav: {url: '//sub.my-ghost-blog.com/blog/'}};
            urlService.utils.urlFor(testContext, testData).should.equal('//sub.my-ghost-blog.com/blog/');
        });

        it('sitemap: should return other known paths when requested', function () {
            configUtils.set({url: 'http://my-ghost-blog.com'});
            urlService.utils.urlFor('sitemap_xsl').should.equal('/sitemap.xsl');
            urlService.utils.urlFor('sitemap_xsl', true).should.equal('http://my-ghost-blog.com/sitemap.xsl');
        });

        it('admin: relative', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com'
            });

            urlService.utils.urlFor('admin').should.equal('/ghost/');
        });

        it('admin: url is http', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com'
            });

            urlService.utils.urlFor('admin', true).should.equal('http://my-ghost-blog.com/ghost/');
        });

        it('admin: custom admin url is set', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com',
                admin: {
                    url: 'https://admin.my-ghost-blog.com'
                }
            });

            urlService.utils.urlFor('admin', true).should.equal('https://admin.my-ghost-blog.com/ghost/');
        });

        it('admin: blog is on subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog'
            });

            urlService.utils.urlFor('admin', true).should.equal('http://my-ghost-blog.com/blog/ghost/');
        });

        it('admin: blog is on subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog/'
            });

            urlService.utils.urlFor('admin', true).should.equal('http://my-ghost-blog.com/blog/ghost/');
        });

        it('admin: blog is on subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog'
            });

            urlService.utils.urlFor('admin').should.equal('/blog/ghost/');
        });

        it('admin: blog is on subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog',
                admin: {
                    url: 'http://something.com'
                }
            });

            urlService.utils.urlFor('admin', true).should.equal('http://something.com/blog/ghost/');
        });

        it('admin: blog is on subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog',
                admin: {
                    url: 'http://something.com/blog'
                }
            });

            urlService.utils.urlFor('admin', true).should.equal('http://something.com/blog/ghost/');
        });

        it('admin: blog is on subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog',
                admin: {
                    url: 'http://something.com/blog/'
                }
            });

            urlService.utils.urlFor('admin', true).should.equal('http://something.com/blog/ghost/');
        });

        it('admin: blog is on subdir', function () {
            configUtils.set({
                url: 'http://my-ghost-blog.com/blog/',
                admin: {
                    url: 'http://something.com/blog'
                }
            });

            urlService.utils.urlFor('admin', true).should.equal('http://something.com/blog/ghost/');
        });

        ['deprecated', 'active'].forEach((apiVersion) => {
            function getApiPath(options) {
                const baseAPIPath = '/ghost/api/';

                switch (options.version) {
                    case 'deprecated':
                        return `${baseAPIPath}v0.1/`;
                    case 'active':
                        if (options.versionType === 'admin') {
                            return `${baseAPIPath}v2/admin/`;
                        } else {
                            return `${baseAPIPath}v2/content/`;
                        }
                    default:
                        return `${baseAPIPath}v0.1/`;
                }
            }

            describe(`for api version: ${apiVersion}`, function () {
                it('api: should return admin url is set', function () {
                    configUtils.set({
                        url: 'http://my-ghost-blog.com',
                        admin: {
                            url: 'https://something.de'
                        }
                    });

                    urlService.utils
                        .urlFor('api', {version: apiVersion, versionType: 'content'}, true)
                        .should.eql(`https://something.de${getApiPath({version: apiVersion, versionType: 'content'})}`);
                });

                it('api: url has subdir', function () {
                    configUtils.set({
                        url: 'http://my-ghost-blog.com/blog'
                    });

                    urlService.utils
                        .urlFor('api', {version: apiVersion, versionType: 'content'}, true)
                        .should.eql(`http://my-ghost-blog.com/blog${getApiPath({version: apiVersion, versionType: 'content'})}`);
                });

                it('api: relative path is correct', function () {
                    urlService.utils
                        .urlFor('api', {version: apiVersion, versionType: 'content'})
                        .should.eql(getApiPath({version: apiVersion, versionType: 'content'}));
                });

                it('api: relative path with subdir is correct', function () {
                    configUtils.set({
                        url: 'http://my-ghost-blog.com/blog'
                    });

                    urlService.utils
                        .urlFor('api', {version: apiVersion, versionType: 'content'})
                        .should.eql(`/blog${getApiPath({version: apiVersion, versionType: 'content'})}`);
                });

                it('api: should return http if config.url is http', function () {
                    configUtils.set({
                        url: 'http://my-ghost-blog.com'
                    });

                    urlService.utils
                        .urlFor('api', {version: apiVersion, versionType: 'content'}, true)
                        .should.eql(`http://my-ghost-blog.com${getApiPath({version: apiVersion, versionType: 'content'})}`);
                });

                it('api: should return https if config.url is https', function () {
                    configUtils.set({
                        url: 'https://my-ghost-blog.com'
                    });

                    urlService.utils
                        .urlFor('api', {version: apiVersion, versionType: 'content'}, true)
                        .should.eql(`https://my-ghost-blog.com${getApiPath({version: apiVersion, versionType: 'content'})}`);
                });

                it('api: with cors, blog url is http: should return no protocol', function () {
                    configUtils.set({
                        url: 'http://my-ghost-blog.com'
                    });

                    urlService.utils
                        .urlFor('api', {cors: true, version: apiVersion, versionType: 'content'}, true)
                        .should.eql(`//my-ghost-blog.com${getApiPath({version: apiVersion, versionType: 'content'})}`);
                });

                it('api: with cors, admin url is http: cors should return no protocol', function () {
                    configUtils.set({
                        url: 'http://my-ghost-blog.com',
                        admin: {
                            url: 'http://admin.ghost.example'
                        }
                    });

                    urlService.utils
                        .urlFor('api', {cors: true, version: apiVersion, versionType: 'content'}, true)
                        .should.eql(`//admin.ghost.example${getApiPath({version: apiVersion, versionType: 'content'})}`);
                });

                it('api: with cors, admin url is https: should return with protocol', function () {
                    configUtils.set({
                        url: 'https://my-ghost-blog.com',
                        admin: {
                            url: 'https://admin.ghost.example'
                        }
                    });

                    urlService.utils
                        .urlFor('api', {cors: true, version: apiVersion, versionType: 'content'}, true)
                        .should.eql(`https://admin.ghost.example${getApiPath({version: apiVersion, versionType: 'content'})}`);
                });

                it('api: with cors, blog url is https: should return with protocol', function () {
                    configUtils.set({
                        url: 'https://my-ghost-blog.com'
                    });

                    urlService.utils
                        .urlFor('api', {cors: true, version: apiVersion, versionType: 'content'}, true)
                        .should.eql(`https://my-ghost-blog.com${getApiPath({version: apiVersion, versionType: 'content'})}`);
                });

                it('api: with stable version, blog url is https: should return stable content api path', function () {
                    configUtils.set({
                        url: 'https://my-ghost-blog.com'
                    });

                    urlService.utils
                        .urlFor('api', {cors: true, version: apiVersion, versionType: 'content'}, true)
                        .should.eql(`https://my-ghost-blog.com${getApiPath({version: apiVersion, versionType: 'content'})}`);
                });

                it('api: with stable version and admin true, blog url is https: should return stable admin api path', function () {
                    configUtils.set({
                        url: 'https://my-ghost-blog.com'
                    });

                    urlService.utils
                        .urlFor('api', {cors: true, version: apiVersion, versionType: 'admin'}, true)
                        .should.eql(`https://my-ghost-blog.com${getApiPath({version: apiVersion, versionType: 'admin'})}`);
                });
            });
        });

        it('api: with active version, blog url is https: should return active content api path', function () {
            configUtils.set({
                url: 'https://my-ghost-blog.com'
            });

            urlService.utils.urlFor('api', {cors: true, version: "active", versionType: 'content'}, true).should.eql('https://my-ghost-blog.com/ghost/api/v2/content/');
        });

        it('api: with active version and admin true, blog url is https: should return active admin api path', function () {
            configUtils.set({
                url: 'https://my-ghost-blog.com'
            });

            urlService.utils.urlFor('api', {cors: true, version: "active", versionType: 'admin'}, true).should.eql('https://my-ghost-blog.com/ghost/api/v2/admin/');
        });
    });

    describe('replacePermalink', function () {
        const localSettingsCache = {};

        beforeEach(function () {
            sandbox.stub(settingsCache, 'get').callsFake(function (key) {
                return localSettingsCache[key];
            });
        });

        it('permalink is /:slug/, timezone is default', function () {
            var testData = testUtils.DataGenerator.Content.posts[2],
                postLink = '/short-and-sweet/';

            urlService.utils.replacePermalink('/:slug/', testData).should.equal(postLink);
        });

        it('permalink is /:year/:month/:day/:slug/, blog timezone is Los Angeles', function () {
            localSettingsCache.active_timezone = 'America/Los_Angeles';

            var testData = testUtils.DataGenerator.Content.posts[2],
                postLink = '/2016/05/17/short-and-sweet/';

            testData.published_at = new Date('2016-05-18T06:30:00.000Z');
            urlService.utils.replacePermalink('/:year/:month/:day/:slug/', testData).should.equal(postLink);
        });

        it('permalink is /:year/:month/:day/:slug/, blog timezone is Asia Tokyo', function () {
            localSettingsCache.active_timezone = 'Asia/Tokyo';

            var testData = testUtils.DataGenerator.Content.posts[2],
                postLink = '/2016/05/18/short-and-sweet/';

            testData.published_at = new Date('2016-05-18T06:30:00.000Z');
            urlService.utils.replacePermalink('/:year/:month/:day/:slug/', testData).should.equal(postLink);
        });

        it('permalink is /:year/:id/:author/, TZ is LA', function () {
            localSettingsCache.active_timezone = 'America/Los_Angeles';

            var testData = _.merge({}, testUtils.DataGenerator.Content.posts[2], {id: 3}, {primary_author: {slug: 'joe-blog'}}),
                postLink = '/2015/3/joe-blog/';

            testData.published_at = new Date('2016-01-01T00:00:00.000Z');
            urlService.utils.replacePermalink('/:year/:id/:author/', testData).should.equal(postLink);
        });

        it('permalink is /:year/:id:/:author/, TZ is Berlin', function () {
            localSettingsCache.active_timezone = 'Europe/Berlin';

            var testData = _.merge({}, testUtils.DataGenerator.Content.posts[2], {id: 3}, {primary_author: {slug: 'joe-blog'}}),
                postLink = '/2016/3/joe-blog/';

            testData.published_at = new Date('2016-01-01T00:00:00.000Z');
            urlService.utils.replacePermalink('/:year/:id/:author/', testData).should.equal(postLink);
        });

        it('permalink is /:primary_tag/:slug/ and there is a primary_tag', function () {
            localSettingsCache.active_timezone = 'Europe/Berlin';

            var testData = _.merge({}, testUtils.DataGenerator.Content.posts[2], {primary_tag: {slug: 'bitcoin'}}),
                postLink = '/bitcoin/short-and-sweet/';

            testData.published_at = new Date('2016-01-01T00:00:00.000Z');
            urlService.utils.replacePermalink('/:primary_tag/:slug/', testData).should.equal(postLink);
        });

        it('permalink is /:primary_tag/:slug/ and there is NO primary_tag', function () {
            localSettingsCache.active_timezone = 'Europe/Berlin';

            var testData = testUtils.DataGenerator.Content.posts[2],
                postLink = '/all/short-and-sweet/';

            testData.published_at = new Date('2016-01-01T00:00:00.000Z');
            urlService.utils.replacePermalink('/:primary_tag/:slug/', testData).should.equal(postLink);
        });

        it('shows "undefined" for unknown route segments', function () {
            localSettingsCache.active_timezone = 'Europe/Berlin';

            var testData = testUtils.DataGenerator.Content.posts[2],
                postLink = '/undefined/short-and-sweet/';

            testData.published_at = new Date('2016-01-01T00:00:00.000Z');
            urlService.utils.replacePermalink('/:tag/:slug/', testData).should.equal(postLink);
        });

        it('post is not published yet', function () {
            localSettingsCache.active_timezone = 'Europe/London';

            var testData = _.merge(testUtils.DataGenerator.Content.posts[2], {id: 3, published_at: null}),
                nowMoment = moment().tz('Europe/London'),
                postLink = '/YYYY/MM/DD/short-and-sweet/';

            postLink = postLink.replace('YYYY', nowMoment.format('YYYY'));
            postLink = postLink.replace('MM', nowMoment.format('MM'));
            postLink = postLink.replace('DD', nowMoment.format('DD'));

            urlService.utils.replacePermalink('/:year/:month/:day/:slug/', testData).should.equal(postLink);
        });
    });

    describe('isSSL', function () {
        it('detects https protocol correctly', function () {
            urlService.utils.isSSL('https://my.blog.com').should.be.true();
            urlService.utils.isSSL('http://my.blog.com').should.be.false();
            urlService.utils.isSSL('http://my.https.com').should.be.false();
        });
    });

    describe('redirects', function () {
        it('performs 301 redirect correctly', function (done) {
            var res = {};

            res.set = sinon.spy();

            res.redirect = function (code, path) {
                code.should.equal(301);
                path.should.eql('my/awesome/path');
                res.set.calledWith({'Cache-Control': 'public, max-age=' + constants.ONE_YEAR_S}).should.be.true();

                done();
            };

            urlService.utils.redirect301(res, 'my/awesome/path');
        });

        it('performs an admin 301 redirect correctly', function (done) {
            var res = {};

            res.set = sinon.spy();

            res.redirect = function (code, path) {
                code.should.equal(301);
                path.should.eql('/ghost/#/my/awesome/path/');
                res.set.calledWith({'Cache-Control': 'public, max-age=' + constants.ONE_YEAR_S}).should.be.true();

                done();
            };

            urlService.utils.redirectToAdmin(301, res, '#/my/awesome/path');
        });

        it('performs an admin 302 redirect correctly', function (done) {
            var res = {};

            res.set = sinon.spy();

            res.redirect = function (path) {
                path.should.eql('/ghost/#/my/awesome/path/');
                res.set.called.should.be.false();

                done();
            };

            urlService.utils.redirectToAdmin(302, res, '#/my/awesome/path');
        });
    });

    describe('make absolute urls ', function () {
        var siteUrl = 'http://my-ghost-blog.com',
            itemUrl = 'my-awesome-post';

        beforeEach(function () {
            configUtils.set({url: 'http://my-ghost-blog.com'});
        });

        afterEach(function () {
            configUtils.restore();
        });

        it('[success] does not convert absolute URLs', function () {
            var html = '<a href="http://my-ghost-blog.com/content/images" title="Absolute URL">',
                result = urlService.utils.makeAbsoluteUrls(html, siteUrl, itemUrl).html();

            result.should.match(/<a href="http:\/\/my-ghost-blog.com\/content\/images" title="Absolute URL">/);
        });
        it('[failure] does not convert protocol relative `//` URLs', function () {
            var html = '<a href="//my-ghost-blog.com/content/images" title="Absolute URL">',
                result = urlService.utils.makeAbsoluteUrls(html, siteUrl, itemUrl).html();

            result.should.match(/<a href="\/\/my-ghost-blog.com\/content\/images" title="Absolute URL">/);
        });
        it('[failure] does not convert internal links starting with "#"', function () {
            var html = '<a href="#jumptosection" title="Table of Content">',
                result = urlService.utils.makeAbsoluteUrls(html, siteUrl, itemUrl).html();

            result.should.match(/<a href="#jumptosection" title="Table of Content">/);
        });
        it('[success] converts a relative URL', function () {
            var html = '<a href="/about#nowhere" title="Relative URL">',
                result = urlService.utils.makeAbsoluteUrls(html, siteUrl, itemUrl).html();

            result.should.match(/<a href="http:\/\/my-ghost-blog.com\/about#nowhere" title="Relative URL">/);
        });
        it('[success] converts a relative URL including subdirectories', function () {
            var html = '<a href="/about#nowhere" title="Relative URL">',
                result = urlService.utils.makeAbsoluteUrls(html, 'http://my-ghost-blog.com/blog', itemUrl).html();

            result.should.match(/<a href="http:\/\/my-ghost-blog.com\/blog\/about#nowhere" title="Relative URL">/);
        });
    });
});
