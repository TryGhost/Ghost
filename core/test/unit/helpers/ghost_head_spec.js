var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    moment = require('moment'),
    testUtils = require('../../utils'),
    configUtils = require('../../utils/configUtils'),
    helpers = require('../../../server/helpers'),
    imageSize = require('../../../server/utils/image-size'),
    proxy = require('../../../server/helpers/proxy'),
    settingsCache = proxy.settingsCache,
    api = proxy.api,
    labs = proxy.labs,

    sandbox = sinon.sandbox.create();

describe('{{ghost_head}} helper', function () {
    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    beforeEach(function () {
        /**
         * Each test case here requests the image dimensions.
         * The image path is e.g. localhost:port/favicon.ico, but no server is running.
         * If we don't mock the image size utility, we run into lot's of timeouts.
         */
        sandbox.stub(imageSize, 'getImageSizeFromUrl').returns(Promise.resolve());

        sandbox.stub(api.clients, 'read').returns(Promise.resolve({
            clients: [
                {slug: 'ghost-frontend', secret: 'a1bcde23cfe5', status: 'enabled'}
            ]
        }));

        sandbox.stub(labs, 'isSet').returns(true);
    });

    describe('without Code Injection', function () {
        var localSettingsCache = {
            title: 'Ghost',
            description: 'blog description',
            cover_image: '/content/images/blog-cover.png',
            amp: true
        };

        beforeEach(function () {
            sandbox.stub(settingsCache, 'get', function (key) {
                return localSettingsCache[key];
            });

            configUtils.set('url', 'http://localhost:65530/');
        });

        it('returns meta tag string on paginated index page without structured data and schema', function (done) {
            // @TODO: later we can extend this fn with an `meta` object e.g. locals.meta
            helpers.ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/page/2/',
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/page\/2\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta name="description"/);
                rendered.string.should.not.match(/<meta property="og/);
                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });

        it('returns structured data on first index page', function (done) {
            helpers.ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/" \/>/);
                rendered.string.should.match(/<meta name="referrer" content="no-referrer-when-downgrade" \/>/);
                rendered.string.should.match(/<meta name="description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/blog-cover.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/blog-cover.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Website"/);
                rendered.string.should.match(/"publisher": {\n        "@type": "Organization",\n        "name": "Ghost",/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/"/);
                rendered.string.should.match(/"image": "http:\/\/localhost:65530\/content\/images\/blog-cover.png"/);
                rendered.string.should.match(/"description": "blog description"/);

                done();
            }).catch(done);
        });

        it('returns structured data on static page', function (done) {
            var renderObject = {
                post: {
                    meta_description: 'all about our blog',
                    title: 'About',
                    feature_image: '/content/images/test-image-about.png',
                    published_at: moment('2008-05-31T19:18:15').toISOString(),
                    updated_at: moment('2014-10-06T15:23:54').toISOString(),
                    og_image: '',
                    og_title: '',
                    og_description: '',
                    twitter_image: '',
                    twitter_title: '',
                    twitter_description: '',
                    page: true,
                    author: {
                        name: 'Author name',
                        url: 'http://testauthorurl.com',
                        slug: 'Author',
                        profile_image: '/content/images/test-author-image.png',
                        website: 'http://authorwebsite.com',
                        facebook: 'testuser',
                        twitter: '@testuser',
                        bio: 'Author bio'
                    }
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/about/',
                    context: ['page'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/about\/" \/>/);
                rendered.string.should.match(/<meta name="referrer" content="no-referrer-when-downgrade" \/>/);
                rendered.string.should.match(/<meta name="description" content="all about our blog" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="About" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="all about our blog" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/about\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/test-image-about.png" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="About" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="all about our blog" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/about\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/test-image-about.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Article"/);
                rendered.string.should.match(/"publisher": {/);
                rendered.string.should.match(/"@type": "Organization"/);
                rendered.string.should.match(/"name": "Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/about\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.match(/"image": "http:\/\/localhost:65530\/content\/images\/test-image-about.png"/);
                rendered.string.should.match(/"image\": \"http:\/\/localhost:65530\/content\/images\/test-author-image.png\"/);
                rendered.string.should.match(/"description": "all about our blog"/);

                done();
            }).catch(done);
        });

        it('returns structured data on static page with custom post structured data', function (done) {
            var renderObject = {
                post: {
                    meta_description: 'all about our blog',
                    title: 'About',
                    feature_image: '/content/images/test-image-about.png',
                    og_image: '/content/images/test-og-image.png',
                    og_title: 'Custom Facebook title',
                    og_description: 'Custom Facebook description',
                    twitter_image: '/content/images/test-twitter-image.png',
                    twitter_title: 'Custom Twitter title',
                    twitter_description: 'Custom Twitter description',
                    published_at: moment('2008-05-31T19:18:15').toISOString(),
                    updated_at: moment('2014-10-06T15:23:54').toISOString(),
                    page: true,
                    author: {
                        name: 'Author name',
                        url: 'http://testauthorurl.com',
                        slug: 'Author',
                        profile_image: '/content/images/test-author-image.png',
                        website: 'http://authorwebsite.com',
                        facebook: 'testuser',
                        twitter: '@testuser',
                        bio: 'Author bio'
                    }
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/about/',
                    context: ['page'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/about\/" \/>/);
                rendered.string.should.match(/<meta name="referrer" content="no-referrer-when-downgrade" \/>/);
                rendered.string.should.match(/<meta name="description" content="all about our blog" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Custom Facebook title" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="Custom Facebook description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/about\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/test-og-image.png" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Custom Twitter title" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="Custom Twitter description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/about\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/test-twitter-image.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Article"/);
                rendered.string.should.match(/"publisher": {/);
                rendered.string.should.match(/"@type": "Organization"/);
                rendered.string.should.match(/"name": "Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/about\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.match(/"image": "http:\/\/localhost:65530\/content\/images\/test-image-about.png"/);
                rendered.string.should.match(/"image\": \"http:\/\/localhost:65530\/content\/images\/test-author-image.png\"/);
                rendered.string.should.match(/"description": "all about our blog"/);

                done();
            }).catch(done);
        });

        it('returns structured data and schema first tag page with meta description and meta title', function (done) {
            var renderObject = {
                tag: {
                    meta_description: 'tag meta description',
                    name: 'tagtitle',
                    meta_title: 'tag meta title',
                    feature_image: '/content/images/tag-image.png'
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/tag/tagtitle/',
                    context: ['tag'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/tag\/tagtitle\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="tag meta description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="tag meta title" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="tag meta description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/tag\/tagtitle\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/tag-image.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="tag meta title" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="tag meta description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/tag\/tagtitle\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/tag-image.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Series"/);
                rendered.string.should.match(/"publisher": {\n        "@type": "Organization",\n        "name": "Ghost",/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/tag\/tagtitle\/"/);
                rendered.string.should.match(/"image": "http:\/\/localhost:65530\/content\/images\/tag-image.png"/);
                rendered.string.should.match(/"name": "tagtitle"/);
                rendered.string.should.match(/"description": "tag meta description"/);

                done();
            }).catch(done);
        });

        it('tag first page without meta data if no meta title and meta description, but model description provided', function (done) {
            var renderObject = {
                tag: {
                    meta_description: '',
                    description: 'tag description',
                    name: 'tagtitle',
                    meta_title: '',
                    feature_image: '/content/images/tag-image.png'
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/tag/tagtitle/',
                    context: ['tag'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/tag\/tagtitle\/" \/>/);
                rendered.string.should.not.match(/<meta name="description"/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="tagtitle - Ghost" \/>/);
                rendered.string.should.not.match(/<meta property="og:description"/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/tag\/tagtitle\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/tag-image.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="tagtitle - Ghost" \/>/);
                rendered.string.should.not.match(/<meta name="twitter:description"/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/tag\/tagtitle\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/tag-image.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Series"/);
                rendered.string.should.match(/"publisher": {\n        "@type": "Organization",\n        "name": "Ghost",/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/tag\/tagtitle\/"/);
                rendered.string.should.match(/"image": "http:\/\/localhost:65530\/content\/images\/tag-image.png"/);
                rendered.string.should.match(/"name": "tagtitle"/);
                rendered.string.should.not.match(/"description":/);

                done();
            }).catch(done);
        });

        it('tag first page without meta and model description returns no description fields', function (done) {
            var renderObject = {
                tag: {
                    meta_description: '',
                    name: 'tagtitle',
                    meta_title: '',
                    feature_image: '/content/images/tag-image.png'
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/tag/tagtitle/',
                    context: ['tag'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.not.match(/<meta name="description"/);
                rendered.string.should.not.match(/<meta property="og:description"/);
                rendered.string.should.not.match(/<meta name="twitter:description"/);
                rendered.string.should.not.match(/"description":/);

                done();
            }).catch(done);
        });

        it('does not return structured data on paginated tag pages', function (done) {
            var renderObject = {
                tag: {
                    meta_description: 'tag meta description',
                    title: 'tagtitle',
                    meta_title: 'tag meta title',
                    feature_image: '/content/images/tag-image.png'
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/tag/tagtitle/page/2/',
                    context: ['paged', 'tag'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/tag\/tagtitle\/page\/2\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.not.match(/<meta name="description" content="tag meta description" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta property="og/);
                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });

        it('returns structured data and schema on first author page with cover image', function (done) {
            var renderObject = {
                author: {
                    name: 'Author name',
                    slug: 'AuthorName',
                    bio: 'Author bio',
                    profile_image: '/content/images/test-author-image.png',
                    cover_image: '/content/images/author-cover-image.png',
                    website: 'http://authorwebsite.com',
                    facebook: 'testuser',
                    twitter: '@testuser'
                }
            }, authorBk = _.cloneDeep(renderObject.author);

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/author/AuthorName/',
                    context: ['author'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/author\/AuthorName\/" \/>/);
                rendered.string.should.not.match(/<meta name="description"/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="profile" \/>/);
                rendered.string.should.not.match(/<meta property="og:description"/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/author\/AuthorName\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/author-cover-image.png" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser\" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Author name - Ghost" \/>/);
                rendered.string.should.not.match(/<meta name="twitter:description"/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/author\/AuthorName\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/author-cover-image.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Person"/);
                rendered.string.should.match(/"sameAs": \[\n        "http:\/\/authorwebsite.com",\n        "https:\/\/www.facebook.com\/testuser",\n        "https:\/\/twitter.com\/testuser"\n    \]/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/author\/AuthorName\/"/);
                rendered.string.should.match(/"image": "http:\/\/localhost:65530\/content\/images\/author-cover-image.png"/);
                rendered.string.should.match(/"name": "Author name"/);
                rendered.string.should.not.match(/"description":/);

                renderObject.author.should.eql(authorBk);

                done();
            }).catch(done);
        });

        it('does not return structured data on paginated author pages', function (done) {
            var renderObject = {
                author: {
                    name: 'Author name',
                    slug: 'AuthorName',
                    bio: 'Author bio',
                    profile_image: '/content/images/test-author-image.png',
                    cover_image: '/content/images/author-cover-image.png',
                    website: 'http://authorwebsite.com'
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/author/AuthorName/page/2/',
                    context: ['paged', 'author'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/author\/AuthorName\/page\/2\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta name="description" /);
                rendered.string.should.not.match(/<meta property="og/);
                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });

        it('returns meta tag string even if safeVersion is invalid', function (done) {
            helpers.ghost_head(testUtils.createHbsResponse({
                locals: {
                    context: [],
                    safeVersion: '0.9'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.9" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('returns structured data on post page with author image and post cover image', function (done) {
            var renderObject = {
                post: {
                    meta_description: 'blog description',
                    custom_excerpt: '',
                    title: 'Welcome to Ghost',
                    feature_image: '/content/images/test-image.png',
                    og_image: '',
                    og_title: 'Custom Facebook title',
                    og_description: 'Custom Facebook description',
                    twitter_image: '/content/images/test-twitter-image.png',
                    twitter_title: '',
                    twitter_description: '',
                    published_at: moment('2008-05-31T19:18:15').toISOString(),
                    updated_at: moment('2014-10-06T15:23:54').toISOString(),
                    tags: [{name: 'tag1'}, {name: 'tag2'}, {name: 'tag3'}],
                    author: {
                        name: 'Author name',
                        url: 'http://testauthorurl.com',
                        slug: 'Author',
                        profile_image: '/content/images/test-author-image.png',
                        website: 'http://authorwebsite.com',
                        bio: 'Author bio',
                        facebook: 'testuser',
                        twitter: '@testuser'
                    }
                }
            }, postBk = _.cloneDeep(renderObject.post);

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                var re1 = new RegExp('<meta property="article:published_time" content="' + renderObject.post.published_at),
                    re2 = new RegExp('<meta property="article:modified_time" content="' + renderObject.post.updated_at),
                    re3 = new RegExp('"datePublished": "' + renderObject.post.published_at),
                    re4 = new RegExp('"dateModified": "' + renderObject.post.updated_at);

                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Custom Facebook title" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="Custom Facebook description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/test-image.png" \/>/);
                rendered.string.should.match(re1);
                rendered.string.should.match(re2);
                rendered.string.should.match(/<meta property="article:tag" content="tag1" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag2" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag3" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/test-twitter-image.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Article"/);
                rendered.string.should.match(/"publisher": {/);
                rendered.string.should.match(/"@type": "Organization"/);
                rendered.string.should.match(/"name": "Ghost"/);
                rendered.string.should.match(/"author": {/);
                rendered.string.should.match(/"@type": "Person"/);
                rendered.string.should.match(/"name": "Author name"/);
                rendered.string.should.match(/"image\": \"http:\/\/localhost:65530\/content\/images\/test-author-image.png\"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/author\/Author\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.not.match(/"description": "Author bio"/);
                rendered.string.should.match(/"headline": "Welcome to Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/post\/"/);
                rendered.string.should.match(re3);
                rendered.string.should.match(re4);
                rendered.string.should.match(/"image": "http:\/\/localhost:65530\/content\/images\/test-image.png"/);
                rendered.string.should.match(/"keywords": "tag1, tag2, tag3"/);
                rendered.string.should.match(/"description": "blog description"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                renderObject.post.should.eql(postBk);

                done();
            }).catch(done);
        });

        it('returns structured data on post page with custom excerpt for description and meta description', function (done) {
            var renderObject = {
                post: {
                    meta_description: 'blog description',
                    custom_excerpt: 'post custom excerpt',
                    title: 'Welcome to Ghost',
                    feature_image: '/content/images/test-image.png',
                    og_image: '/content/images/test-facebook-image.png',
                    og_title: '',
                    og_description: '',
                    twitter_image: '/content/images/test-twitter-image.png',
                    twitter_title: 'Custom Twitter title',
                    twitter_description: '',
                    published_at: moment('2008-05-31T19:18:15').toISOString(),
                    updated_at: moment('2014-10-06T15:23:54').toISOString(),
                    tags: [{name: 'tag1'}, {name: 'tag2'}, {name: 'tag3'}],
                    author: {
                        name: 'Author name',
                        url: 'http://testauthorurl.com',
                        slug: 'Author',
                        profile_image: '/content/images/test-author-image.png',
                        website: 'http://authorwebsite.com',
                        bio: 'Author bio',
                        facebook: 'testuser',
                        twitter: '@testuser'
                    }
                }
            }, postBk = _.cloneDeep(renderObject.post);

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                var re1 = new RegExp('<meta property="article:published_time" content="' + renderObject.post.published_at),
                    re2 = new RegExp('<meta property="article:modified_time" content="' + renderObject.post.updated_at),
                    re3 = new RegExp('"datePublished": "' + renderObject.post.published_at),
                    re4 = new RegExp('"dateModified": "' + renderObject.post.updated_at);

                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="post custom excerpt" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/test-facebook-image.png" \/>/);
                rendered.string.should.match(re1);
                rendered.string.should.match(re2);
                rendered.string.should.match(/<meta property="article:tag" content="tag1" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag2" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag3" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Custom Twitter title" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="post custom excerpt" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/test-twitter-image.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Article"/);
                rendered.string.should.match(/"publisher": {/);
                rendered.string.should.match(/"@type": "Organization"/);
                rendered.string.should.match(/"name": "Ghost"/);
                rendered.string.should.match(/"author": {/);
                rendered.string.should.match(/"@type": "Person"/);
                rendered.string.should.match(/"name": "Author name"/);
                rendered.string.should.match(/"image\": \"http:\/\/localhost:65530\/content\/images\/test-author-image.png\"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/author\/Author\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.not.match(/"description": "Author bio"/);
                rendered.string.should.match(/"headline": "Welcome to Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/post\/"/);
                rendered.string.should.match(re3);
                rendered.string.should.match(re4);
                rendered.string.should.match(/"image": "http:\/\/localhost:65530\/content\/images\/test-image.png"/);
                rendered.string.should.match(/"keywords": "tag1, tag2, tag3"/);
                rendered.string.should.match(/"description": "post custom excerpt"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                renderObject.post.should.eql(postBk);

                done();
            }).catch(done);
        });

        it('returns structured data on post page with fall back excerpt if no meta description provided', function (done) {
            var renderObject = {
                post: {
                    meta_description: '',
                    custom_excerpt: '',
                    title: 'Welcome to Ghost',
                    html: '<p>This is a short post</p>',
                    author: {
                        name: 'Author name',
                        url: 'http://testauthorurl.com',
                        slug: 'Author'
                    }
                }
            }, postBk = _.cloneDeep(renderObject.post);

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.not.match(/<meta name="description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="This is a short post" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="This is a short post" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Article"/);
                rendered.string.should.match(/"publisher": {/);
                rendered.string.should.match(/"@type": "Organization"/);
                rendered.string.should.match(/"name": "Ghost"/);
                rendered.string.should.match(/"author": {/);
                rendered.string.should.match(/"@type": "Person"/);
                rendered.string.should.match(/"name": "Author name"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/author\/Author\/"/);
                rendered.string.should.not.match(/"description": "Author bio"/);
                rendered.string.should.match(/"headline": "Welcome to Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/post\/"/);
                rendered.string.should.match(/"description": "This is a short post"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                renderObject.post.should.eql(postBk);

                done();
            }).catch(done);
        });

        it('returns structured data on AMP post page with author image and post cover image', function (done) {
            var renderObject = {
                post: {
                    meta_description: 'blog description',
                    title: 'Welcome to Ghost',
                    feature_image: '/content/images/test-image.png',
                    og_image: '/content/images/test-facebook-image.png',
                    og_title: 'Custom Facebook title',
                    og_description: '',
                    twitter_image: '/content/images/test-twitter-image.png',
                    twitter_title: 'Custom Twitter title',
                    twitter_description: '',
                    published_at: moment('2008-05-31T19:18:15').toISOString(),
                    updated_at: moment('2014-10-06T15:23:54').toISOString(),
                    tags: [{name: 'tag1'}, {name: 'tag2'}, {name: 'tag3'}],
                    author: {
                        name: 'Author name',
                        url: 'http://testauthorurl.com',
                        slug: 'Author',
                        profile_image: '/content/images/test-author-image.png',
                        website: 'http://authorwebsite.com',
                        bio: 'Author bio',
                        facebook: 'testuser',
                        twitter: '@testuser'
                    }
                }
            }, postBk = _.cloneDeep(renderObject.post);

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/amp/',
                    context: ['amp', 'post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                var re1 = new RegExp('<meta property="article:published_time" content="' + renderObject.post.published_at),
                    re2 = new RegExp('<meta property="article:modified_time" content="' + renderObject.post.updated_at),
                    re3 = new RegExp('"datePublished": "' + renderObject.post.published_at),
                    re4 = new RegExp('"dateModified": "' + renderObject.post.updated_at);

                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.not.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Custom Facebook title" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/test-facebook-image.png" \/>/);
                rendered.string.should.match(re1);
                rendered.string.should.match(re2);
                rendered.string.should.match(/<meta property="article:tag" content="tag1" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag2" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag3" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Custom Twitter title" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/test-twitter-image.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Article"/);
                rendered.string.should.match(/"publisher": {/);
                rendered.string.should.match(/"@type": "Organization"/);
                rendered.string.should.match(/"name": "Ghost"/);
                rendered.string.should.match(/"author": {/);
                rendered.string.should.match(/"@type": "Person"/);
                rendered.string.should.match(/"name": "Author name"/);
                rendered.string.should.match(/"image\": \"http:\/\/localhost:65530\/content\/images\/test-author-image.png\"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/author\/Author\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.not.match(/"description": "Author bio"/);
                rendered.string.should.match(/"headline": "Welcome to Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/post\/"/);
                rendered.string.should.match(re3);
                rendered.string.should.match(re4);
                rendered.string.should.match(/"image": "http:\/\/localhost:65530\/content\/images\/test-image.png"/);
                rendered.string.should.match(/"keywords": "tag1, tag2, tag3"/);
                rendered.string.should.match(/"description": "blog description"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                renderObject.post.should.eql(postBk);

                done();
            }).catch(done);
        });

        it('returns structured data if metaTitle and metaDescription have double quotes', function (done) {
            var renderObject = {
                post: {
                    meta_description: 'blog "test" description',
                    title: 'title',
                    meta_title: 'Welcome to Ghost "test"',
                    feature_image: '/content/images/test-image.png',
                    published_at: moment('2008-05-31T19:18:15').toISOString(),
                    updated_at: moment('2014-10-06T15:23:54').toISOString(),
                    tags: [{name: 'tag1'}, {name: 'tag2'}, {name: 'tag3'}],
                    author: {
                        name: 'Author name',
                        url: 'http//:testauthorurl.com',
                        slug: 'Author',
                        profile_image: '/content/images/test-author-image.png',
                        website: 'http://authorwebsite.com',
                        facebook: 'testuser',
                        twitter: '@testuser'
                    }
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                var re1 = new RegExp('<meta property="article:published_time" content="' + renderObject.post.published_at),
                    re2 = new RegExp('<meta property="article:modified_time" content="' + renderObject.post.updated_at),
                    re3 = new RegExp('"datePublished": "' + renderObject.post.published_at),
                    re4 = new RegExp('"dateModified": "' + renderObject.post.updated_at);

                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="blog &quot;test&quot; description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Welcome to Ghost &quot;test&quot;" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="blog &quot;test&quot; description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/test-image.png" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(re1);
                rendered.string.should.match(re2);
                rendered.string.should.match(/<meta property="article:tag" content="tag1" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag2" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag3" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Welcome to Ghost &quot;test&quot;" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="blog &quot;test&quot; description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/test-image.png" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Article"/);
                rendered.string.should.match(/"publisher": {/);
                rendered.string.should.match(/"@type": "Organization"/);
                rendered.string.should.match(/"name": "Ghost"/);
                rendered.string.should.match(/"author": {/);
                rendered.string.should.match(/"@type": "Person"/);
                rendered.string.should.match(/"name": "Author name"/);
                rendered.string.should.match(/"image\": \"http:\/\/localhost:65530\/content\/images\/test-author-image.png\"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/author\/Author\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.match(/"headline": "Welcome to Ghost &quot;test&quot;"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/post\/"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(re3);
                rendered.string.should.match(re4);
                rendered.string.should.match(/"image": "http:\/\/localhost:65530\/content\/images\/test-image.png"/);
                rendered.string.should.match(/"keywords": "tag1, tag2, tag3"/);
                rendered.string.should.match(/"description": "blog &quot;test&quot; description"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('returns structured data without tags if there are no tags', function (done) {
            var renderObject = {
                post: {
                    meta_description: 'blog description',
                    title: 'Welcome to Ghost',
                    feature_image: '/content/images/test-image.png',
                    published_at: moment('2008-05-31T19:18:15').toISOString(),
                    updated_at: moment('2014-10-06T15:23:54').toISOString(),
                    tags: [],
                    author: {
                        name: 'Author name',
                        url: 'http//:testauthorurl.com',
                        slug: 'Author',
                        profile_image: '/content/images/test-author-image.png',
                        website: 'http://authorwebsite.com',
                        facebook: 'testuser',
                        twitter: '@testuser'
                    }
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                var re1 = new RegExp('<meta property="article:published_time" content="' + renderObject.post.published_at),
                    re2 = new RegExp('<meta property="article:modified_time" content="' + renderObject.post.updated_at),
                    re3 = new RegExp('"datePublished": "' + renderObject.post.published_at),
                    re4 = new RegExp('"dateModified": "' + renderObject.post.updated_at);

                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/test-image.png" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(re1);
                rendered.string.should.match(re2);
                rendered.string.should.not.match(/<meta property="article:tag"/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/test-image.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Article"/);
                rendered.string.should.match(/"publisher": {/);
                rendered.string.should.match(/"@type": "Organization"/);
                rendered.string.should.match(/"author": {/);
                rendered.string.should.match(/"@type": "Person"/);
                rendered.string.should.match(/"name": "Author name"/);
                rendered.string.should.match(/"image\": \"http:\/\/localhost:65530\/content\/images\/test-author-image.png\"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/author\/Author\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.match(/"headline": "Welcome to Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/post\/"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(re3);
                rendered.string.should.match(re4);
                rendered.string.should.match(/"image": "http:\/\/localhost:65530\/content\/images\/test-image.png"/);
                rendered.string.should.not.match(/"keywords":/);
                rendered.string.should.match(/"description": "blog description"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('returns structured data on post page with null author image and post cover image', function (done) {
            var renderObject = {
                post: {
                    meta_description: 'blog description',
                    title: 'Welcome to Ghost',
                    feature_image: null,
                    published_at: moment('2008-05-31T19:18:15').toISOString(),
                    updated_at: moment('2014-10-06T15:23:54').toISOString(),
                    tags: [{name: 'tag1'}, {name: 'tag2'}, {name: 'tag3'}],
                    author: {
                        name: 'Author name',
                        url: 'http//:testauthorurl.com',
                        slug: 'Author',
                        profile_image: null,
                        website: 'http://authorwebsite.com',
                        facebook: 'testuser',
                        twitter: '@testuser'
                    }
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                var re1 = new RegExp('<meta property="article:published_time" content="' + renderObject.post.published_at),
                    re2 = new RegExp('<meta property="article:modified_time" content="' + renderObject.post.updated_at),
                    re3 = new RegExp('"datePublished": "' + renderObject.post.published_at),
                    re4 = new RegExp('"dateModified": "' + renderObject.post.updated_at);

                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.not.match(/<meta property="og:image"/);
                rendered.string.should.match(re1);
                rendered.string.should.match(re2);
                rendered.string.should.match(/<meta property="article:tag" content="tag1" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag2" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag3" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.not.match(/<meta name="twitter:image"/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Article"/);
                rendered.string.should.match(/"publisher": {/);
                rendered.string.should.match(/"@type": "Organization"/);
                rendered.string.should.match(/"name": "Ghost"/);
                rendered.string.should.match(/"author": {/);
                rendered.string.should.match(/"@type": "Person"/);
                rendered.string.should.match(/"name": "Author name"/);
                rendered.string.should.not.match(/"image\"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/author\/Author\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.match(/"headline": "Welcome to Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/post\/"/);
                rendered.string.should.match(re3);
                rendered.string.should.match(re4);
                rendered.string.should.match(/"keywords": "tag1, tag2, tag3"/);
                rendered.string.should.match(/"description": "blog description"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('outputs structured data but not schema for custom channel', function (done) {
            helpers.ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/featured/',
                    context: ['featured'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/featured\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/featured\/" \/>/);

                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.not.match(/<meta name="description" /);

                done();
            }).catch(done);
        });

        it('returns twitter and facebook descriptions even if no meta description available', function (done) {
            var renderObject = {
                post: {
                    title: 'Welcome to Ghost',
                    html: '<p>This is a short post</p>',
                    author: {
                        name: 'Author name'
                    }
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.not.match(/<meta name="description" /);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="This is a short post" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="This is a short post" \/>/);

                done();
            }).catch(done);
        });

        it('returns canonical URL', function (done) {
            var renderObject = {
                post: {
                    title: 'Welcome to Ghost',
                    html: '<p>This is a short post</p>',
                    author: {
                        name: 'Author name'
                    }
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/about/',
                    context: ['page'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/about\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('returns next & prev URL correctly for middle page', function (done) {
            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: {
                    pagination: {total: 4, page: 3, next: 4, prev: 2}
                },
                locals: {
                    relativeUrl: '/page/3/',
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/page\/3\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="prev" href="http:\/\/localhost:65530\/page\/2\/" \/>/);
                rendered.string.should.match(/<link rel="next" href="http:\/\/localhost:65530\/page\/4\/" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta property="og/);
                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });

        it('returns next & prev URL correctly for second page', function (done) {
            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: {
                    pagination: {total: 3, page: 2, next: 3, prev: 1}
                },
                locals: {
                    relativeUrl: '/page/2/',
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.ico" type="image\/x-icon" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/page\/2\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="prev" href="http:\/\/localhost:65530\/" \/>/);
                rendered.string.should.match(/<link rel="next" href="http:\/\/localhost:65530\/page\/3\/" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta property="og/);
                rendered.string.should.not.match(/<meta name="description" /);
                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });

        describe('with /blog subdirectory', function () {
            beforeEach(function () {
                localSettingsCache.icon = '/content/images/favicon.png';

                configUtils.set({
                    url: 'http://localhost:65530/blog/'
                });
            });

            it('returns correct rss url with subdirectory', function (done) {
                helpers.ghost_head(testUtils.createHbsResponse({
                    locals: {
                        context: ['paged', 'index'],
                        safeVersion: '0.3'
                    }
                })).then(function (rendered) {
                    should.exist(rendered);
                    rendered.string.should.match(/<link rel="shortcut icon" href="\/blog\/favicon.png" type="image\/png" \/>/);
                    rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/blog\/" \/>/);
                    rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                    rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/blog\/rss\/" \/>/);
                    rendered.string.should.not.match(/<meta name="description" /);

                    done();
                }).catch(done);
            });
        });
    });

    describe('with changed origin in config file', function () {
        var localSettingsCache = {
            title: 'Ghost',
            description: 'blog description',
            cover_image: '/content/images/blog-cover.png',
            amp: true,
            icon: '/content/images/favicon.png'
        };

        beforeEach(function () {
            sandbox.stub(settingsCache, 'get', function (key) {
                return localSettingsCache[key];
            });

            configUtils.set({
                url: 'http://localhost:65530/blog/',
                referrerPolicy: 'origin'
            });
        });

        it('contains the changed origin', function (done) {
            helpers.ghost_head(testUtils.createHbsResponse({
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/blog\/favicon.png" type="image\/png" \/>/);
                rendered.string.should.match(/<meta name="referrer" content="origin" \/>/);
                rendered.string.should.not.match(/<meta name="description" /);

                done();
            }).catch(done);
        });
    });

    describe('with useStructuredData is set to false in config file', function () {
        var localSettingsCache = {
            title: 'Ghost',
            description: 'blog description',
            cover_image: '/content/images/blog-cover.png',
            amp: true,
            icon: '/content/images/favicon.png'
        };

        beforeEach(function () {
            sandbox.stub(settingsCache, 'get', function (key) {
                return localSettingsCache[key];
            });

            configUtils.set({
                url: 'http://localhost:65530/',
                privacy: {
                    useStructuredData: false
                }
            });
        });

        it('does not return structured data', function (done) {
            var renderObject = {
                post: {
                    meta_description: 'blog description',
                    title: 'Welcome to Ghost',
                    image: 'content/images/test-image.png',
                    published_at: moment('2008-05-31T19:18:15').toISOString(),
                    updated_at: moment('2014-10-06T15:23:54').toISOString(),
                    tags: [{name: 'tag1'}, {name: 'tag2'}, {name: 'tag3'}],
                    author: {
                        name: 'Author name',
                        url: 'http//:testauthorurl.com',
                        slug: 'Author',
                        image: 'content/images/test-author-image.png',
                        website: 'http://authorwebsite.com',
                        facebook: 'testuser',
                        twitter: '@testuser'
                    }
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.png" type="image\/png" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="blog description" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta property="og/);
                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });
    });

    describe('with Code Injection', function () {
        var localSettingsCache = {
            title: 'Ghost',
            description: 'blog description',
            cover_image: '/content/images/blog-cover.png',
            icon: '/content/images/favicon.png',
            ghost_head: '<style>body {background: red;}</style>'
        };

        beforeEach(function () {
            sandbox.stub(settingsCache, 'get', function (key) {
                return localSettingsCache[key];
            });

            configUtils.set({
                url: 'http://localhost:65530/'
            });
        });

        it('returns meta tag plus injected code', function (done) {
            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: {
                    post: false
                },
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.png" type="image\/png" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.match(/<style>body {background: red;}<\/style>/);

                // No default meta desc in paged context
                rendered.string.should.not.match(/<meta name="description" \/>/);

                done();
            }).catch(done);
        });

        it('outputs post codeinjection as well', function (done) {
            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: {
                    post: {
                        codeinjection_head: 'post-codeinjection'
                    }
                },
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<style>body {background: red;}<\/style>/);
                rendered.string.should.match(/post-codeinjection/);

                done();
            }).catch(done);
        });

        it('handles post codeinjection being empty', function (done) {
            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: {
                    post: {
                        codeinjection_head: ''
                    }
                },
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<style>body {background: red;}<\/style>/);
                rendered.string.should.not.match(/post-codeinjection/);

                done();
            }).catch(done);
        });

        it('handles post codeinjection being null', function (done) {
            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: {
                    post: {
                        codeinjection_head: null
                    }
                },
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<style>body {background: red;}<\/style>/);
                rendered.string.should.not.match(/post-codeinjection/);

                done();
            }).catch(done);
        });

        it('returns meta tag without injected code for amp context', function (done) {
            var renderObject = {
                post: {
                    meta_description: 'blog description',
                    title: 'Welcome to Ghost',
                    image: 'content/images/test-image.png',
                    published_at: moment('2008-05-31T19:18:15').toISOString(),
                    updated_at: moment('2014-10-06T15:23:54').toISOString(),
                    tags: [{name: 'tag1'}, {name: 'tag2'}, {name: 'tag3'}],
                    author: {
                        name: 'Author name',
                        url: 'http//:testauthorurl.com',
                        slug: 'Author',
                        image: 'content/images/test-author-image.png',
                        website: 'http://authorwebsite.com',
                        facebook: 'testuser',
                        twitter: '@testuser'
                    }
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    context: ['amp', 'post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="shortcut icon" href="\/favicon.png" type="image\/png" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.not.match(/<style>body {background: red;}<\/style>/);

                done();
            }).catch(done);
        });
    });

    describe('with Ajax Helper', function () {
        before(function () {
            configUtils.set({
                url: 'http://localhost:65530/'
            });
        });

        it('renders script tag with src', function (done) {
            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: {
                    post: false
                },
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3',
                    client: testUtils.DataGenerator.forKnex.createClient()
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<script type="text\/javascript" src="\/public\/ghost-sdk\.js\?v=/);

                done();
            });
        });

        it('renders script tag with init correctly', function (done) {
            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: {
                    post: false
                },
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3',
                    client: testUtils.DataGenerator.forKnex.createClient()
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<script type="text\/javascript">\n/);
                rendered.string.should.match(/ghost\.init\(\{/);
                rendered.string.should.match(/\tclientId: "/);
                rendered.string.should.match(/\tclientSecret: "/);
                rendered.string.should.match(/}\);\n/);
                rendered.string.should.match(/\n<\/script>/);

                done();
            });
        });
        it('does not render script tag with for amp context', function (done) {
            var renderObject = {
                post: {
                    meta_description: 'blog description',
                    title: 'Welcome to Ghost',
                    image: 'content/images/test-image.png',
                    published_at: moment('2008-05-31T19:18:15').toISOString(),
                    updated_at: moment('2014-10-06T15:23:54').toISOString(),
                    tags: [{name: 'tag1'}, {name: 'tag2'}, {name: 'tag3'}],
                    author: {
                        name: 'Author name',
                        url: 'http//:testauthorurl.com',
                        slug: 'Author',
                        image: 'content/images/test-author-image.png',
                        website: 'http://authorwebsite.com',
                        facebook: 'testuser',
                        twitter: '@testuser'
                    }
                }
            };

            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    context: ['amp', 'post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.not.match(/<script type="text\/javascript">\n/);
                rendered.string.should.not.match(/ghost\.init\(\{/);
                rendered.string.should.not.match(/\tclientId: "/);
                rendered.string.should.not.match(/\tclientSecret: "/);
                rendered.string.should.not.match(/}\);\n/);
                rendered.string.should.not.match(/\n<\/script>/);

                done();
            });
        });
    });

    describe('amp is disabled', function () {
        var localSettingsCache = {
            amp: false
        };

        beforeEach(function () {
            configUtils.set({
                url: 'http://localhost:65530/'
            });

            sandbox.stub(settingsCache, 'get', function (key) {
                return localSettingsCache[key];
            });
        });

        it('does not contain amphtml link', function (done) {
            var renderObject = {
                post: {
                    meta_description: 'blog description',
                    title: 'Welcome to Ghost',
                    image: 'content/images/test-image.png',
                    published_at: moment('2008-05-31T19:18:15').toISOString(),
                    updated_at: moment('2014-10-06T15:23:54').toISOString(),
                    tags: [{name: 'tag1'}, {name: 'tag2'}, {name: 'tag3'}],
                    author: {
                        name: 'Author name',
                        url: 'http//:testauthorurl.com',
                        slug: 'Author',
                        image: 'content/images/test-author-image.png',
                        website: 'http://authorwebsite.com',
                        facebook: 'testuser',
                        twitter: '@testuser'
                    }
                }
            };
            helpers.ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.not.match(/<link rel="amphtml"/);
                done();
            }).catch(done);
        });
    });
});
