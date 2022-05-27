/* eslint-disable no-regex-spaces */
const should = require('should');

const sinon = require('sinon');
const _ = require('lodash');
const moment = require('moment');
const testUtils = require('../../../utils');
const configUtils = require('../../../utils/configUtils');
const themeEngine = require('../../../../core/frontend/services/theme-engine');
const models = require('../../../../core/server/models');
const imageLib = require('../../../../core/server/lib/image');
const routing = require('../../../../core/frontend/services/routing');
const urlService = require('../../../../core/server/services/url');

const ghost_head = require('../../../../core/frontend/helpers/ghost_head');
const proxy = require('../../../../core/frontend/services/proxy');
const {settingsCache} = proxy;

describe('{{ghost_head}} helper', function () {
    let posts = [];
    let tags = [];
    let authors = [];
    let users = [];

    let keyStub;

    const makeFixtures = () => {
        const {createPost, createUser, createTag} = testUtils.DataGenerator.forKnex;

        /** TAGS - used for tag pages */
        tags.push(createTag({
            meta_description: 'tag meta description',
            name: 'tagtitle',
            meta_title: 'tag meta title',
            feature_image: '/content/images/tag-image.png'
        }));

        tags.push(createTag({
            meta_description: '',
            description: 'tag description',
            name: 'tagtitle',
            meta_title: '',
            feature_image: '/content/images/tag-image.png'
        }));
        tags.push(createTag({
            description: '',
            meta_description: '',
            name: 'tagtitle',
            meta_title: '',
            feature_image: '/content/images/tag-image.png'
        }));

        tags.push(createTag({
            meta_description: 'tag meta description',
            title: 'tagtitle',
            meta_title: 'tag meta title',
            feature_image: '/content/images/tag-image.png'
        }));

        /** USERS - used for author PAGES */
        users.push(createUser({
            name: 'Author name',
            slug: 'AuthorName',
            bio: 'Author bio',
            profile_image: '/content/images/test-author-image.png',
            cover_image: '/content/images/author-cover-image.png',
            website: 'http://authorwebsite.com',
            facebook: 'testuser',
            twitter: '@testuser'
        }));

        users.push(createUser({
            name: 'Author name',
            slug: 'AuthorName1',
            bio: 'Author bio',
            profile_image: '/content/images/test-author-image.png',
            cover_image: '/content/images/author-cover-image.png',
            website: 'http://authorwebsite.com'
        }));

        /** AUTHORS - related to posts */
        authors.push(createUser({// Author 0
            profile_image: '/content/images/test-author-image.png',
            website: 'http://authorwebsite.com',
            facebook: 'testuser',
            twitter: '@testuser'
        }));

        authors.push(createUser({// Author 1
            name: 'Author name',
            slug: 'author2',
            profile_image: '/content/images/test-author-image.png',
            website: 'http://authorwebsite.com',
            bio: 'Author bio',
            facebook: 'testuser',
            twitter: '@testuser'
        }));

        authors.push(createUser({// Author 2
            name: 'Author name',
            slug: 'author3',
            profile_image: '/content/images/test-author-image.png',
            website: 'http://authorwebsite.com',
            facebook: 'testuser',
            twitter: '@testuser',
            bio: 'Author bio'
        }));

        authors.push(createUser({// Author 3
            name: 'Author name',
            url: 'http://testauthorurl.com',
            slug: 'author4',
            profile_image: '/content/images/test-author-image.png',
            website: 'http://authorwebsite.com',
            facebook: 'testuser',
            twitter: '@testuser'
        }));

        authors.push(createUser({// Author 4
            name: 'Author name'
        }));

        authors.push(createUser({// Author 5
            name: 'Author name',
            url: 'http://testauthorurl.com',
            slug: 'author8',
            profile_image: null,
            website: 'http://authorwebsite.com',
            facebook: 'testuser',
            twitter: '@testuser'
        }));

        /** POSTS */

        posts.push(createPost({// Post 0
            meta_description: 'all about our site',
            title: 'About',
            feature_image: '/content/images/test-image-about.png',
            page: true,
            authors: [authors[0]],
            primary_author: authors[0]
        }));

        posts.push(createPost({// Post 1
            meta_description: 'all about our site',
            title: 'About',
            feature_image: '/content/images/test-image-about.png',
            og_image: '/content/images/test-og-image.png',
            og_title: 'Custom Facebook title',
            og_description: 'Custom Facebook description',
            twitter_image: '/content/images/test-twitter-image.png',
            twitter_title: 'Custom Twitter title',
            twitter_description: 'Custom Twitter description',
            page: true,
            authors: [authors[0]],
            primary_author: authors[0]
        }));

        posts.push(createPost({// Post 2
            meta_description: 'site description',
            title: 'Welcome to Ghost',
            feature_image: '/content/images/test-image.png',
            og_title: 'Custom Facebook title',
            og_description: 'Custom Facebook description',
            twitter_image: '/content/images/test-twitter-image.png',
            published_at: moment('2008-05-31T19:18:15').toDate(),
            updated_at: moment('2014-10-06T15:23:54').toDate(),
            tags: [
                createTag({name: 'tag1'}),
                createTag({name: 'tag2'}),
                createTag({name: 'tag3'})
            ],
            authors: [authors[1]],
            primary_author: authors[1]
        }));

        posts.push(createPost({// Post 3
            meta_description: 'site description',
            custom_excerpt: 'post custom excerpt',
            title: 'Welcome to Ghost',
            feature_image: '/content/images/test-image.png',
            og_image: '/content/images/test-facebook-image.png',
            twitter_image: '/content/images/test-twitter-image.png',
            twitter_title: 'Custom Twitter title',
            tags: [
                createTag({name: 'tag1'}),
                createTag({name: 'tag2'}),
                createTag({name: 'tag3'})
            ],
            authors: [
                authors[2]
            ],
            primary_author: authors[2]
        }));

        posts.push(createPost({// Post 4
            title: 'Welcome to Ghost',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('This is a short post'),
            excerpt: 'This is a short post',
            authors: [
                authors[3]
            ],
            primary_author: authors[3]
        }));

        posts.push(createPost({// Post 5
            meta_description: 'site description',
            title: 'Welcome to Ghost',
            feature_image: '/content/images/test-image.png',
            og_image: '/content/images/test-facebook-image.png',
            og_title: 'Custom Facebook title',
            twitter_image: '/content/images/test-twitter-image.png',
            twitter_title: 'Custom Twitter title',
            tags: [
                createTag({name: 'tag1'}),
                createTag({name: 'tag2'}),
                createTag({name: 'tag3'})
            ],
            authors: [
                authors[3]
            ],
            primary_author: authors[3]
        }));

        posts.push(createPost({// Post 6
            meta_description: 'site "test" description',
            title: 'title',
            meta_title: 'Welcome to Ghost "test"',
            feature_image: '/content/images/test-image.png',
            tags: [
                createTag({name: 'tag1'}),
                createTag({name: 'tag2'}),
                createTag({name: 'tag3'})
            ],
            authors: [
                authors[3]
            ],
            primary_author: authors[3]
        }));

        posts.push(createPost({// Post 7
            meta_description: 'site description',
            title: 'Welcome to Ghost',
            feature_image: '/content/images/test-image.png',
            tags: [],
            authors: [
                authors[3]
            ],
            primary_author: authors[3]
        }));

        posts.push(createPost({// Post 8
            meta_description: 'site description',
            title: 'Welcome to Ghost',
            feature_image: null,
            tags: [
                createTag({name: 'tag1'}),
                createTag({name: 'tag2'}),
                createTag({name: 'tag3'})
            ],
            authors: [
                authors[5]
            ],
            primary_author: authors[5]
        }));

        posts.push(createPost({// Post 9
            title: 'Welcome to Ghost',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('This is a short post'),
            excerpt: 'This is a short post',
            tags: [
                createTag({name: 'tag1'}),
                createTag({name: 'tag2'}),
                createTag({name: 'tag3'})
            ],
            authors: [
                authors[4]
            ],
            primary_author: authors[4]
        }));
    };

    before(function () {
        // @TODO: remove when visibility is refactored out of models
        models.init();

        keyStub = sinon.stub().resolves('xyz');
        const dataService = {
            getFrontendKey: keyStub
        };
        proxy.init({dataService});
    });

    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId').returns('https://mysite.com/fakeauthor/');

        // @TODO: this is a LOT of mocking :/
        sinon.stub(routing.registry, 'getRssUrl').returns('http://localhost:65530/rss/');
        sinon.stub(imageLib.imageSize, 'getImageSizeFromUrl').resolves();
        sinon.stub(settingsCache, 'get');

        settingsCache.get.withArgs('title').returns('Ghost');
        settingsCache.get.withArgs('description').returns('site description');
        settingsCache.get.withArgs('cover_image').returns('/content/images/site-cover.png');
        settingsCache.get.withArgs('amp').returns(true);

        makeFixtures();
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
    });

    describe('without Code Injection', function () {
        beforeEach(function () {
            configUtils.set({url: 'http://localhost:65530/'});
        });

        it('returns meta tag string on paginated index page without structured data and schema', function (done) {
            // @TODO: later we can extend this fn with an `meta` object e.g. locals.meta
            ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/page/2/',
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
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
            ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/" \/>/);
                rendered.string.should.match(/<meta name="referrer" content="no-referrer-when-downgrade" \/>/);
                rendered.string.should.match(/<meta name="description" content="site description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="site description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/site-cover.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="site description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/site-cover.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "WebSite"/);
                rendered.string.should.match(/"publisher": {\n        "@type": "Organization",\n        "name": "Ghost",/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/"/);
                rendered.string.should.match(/"image": {\n        "@type": "ImageObject",\n        "url": "http:\/\/localhost:65530\/content\/images\/site-cover.png"\n/);
                rendered.string.should.match(/"description": "site description"/);

                done();
            }).catch(done);
        });

        it('returns meta structured data on homepage with site metadata defined', function (done) {
            settingsCache.get.withArgs('meta_description').returns('site SEO description');

            settingsCache.get.withArgs('og_title').returns('facebook site title');
            settingsCache.get.withArgs('og_description').returns('facebook site description');
            settingsCache.get.withArgs('og_image').returns('/content/images/facebook-image.png');

            settingsCache.get.withArgs('twitter_title').returns('twitter site title');
            settingsCache.get.withArgs('twitter_description').returns('twitter site description');
            settingsCache.get.withArgs('twitter_image').returns('/content/images/twitter-image.png');

            ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/" \/>/);
                rendered.string.should.match(/<meta name="referrer" content="no-referrer-when-downgrade" \/>/);
                rendered.string.should.match(/<meta name="description" content="site SEO description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="facebook site title" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="facebook site description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/facebook-image.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="twitter site title" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="twitter site description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/twitter-image.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "WebSite"/);
                rendered.string.should.match(/"publisher": {\n        "@type": "Organization",\n        "name": "Ghost",/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/"/);
                rendered.string.should.match(/"image": {\n        "@type": "ImageObject",\n        "url": "http:\/\/localhost:65530\/content\/images\/site-cover.png"\n/);
                rendered.string.should.match(/"description": "site SEO description"/);

                done();
            }).catch(done);
        });

        it('returns structured data on static page', function (done) {
            const renderObject = {
                post: posts[0]
            };

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/about/',
                    context: ['page'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/about\/" \/>/);
                rendered.string.should.match(/<meta name="referrer" content="no-referrer-when-downgrade" \/>/);
                rendered.string.should.match(/<meta name="description" content="all about our site" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="About" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="all about our site" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/about\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/test-image-about.png" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="About" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="all about our site" \/>/);
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
                rendered.string.should.match(/"image": {\n        "@type": "ImageObject",\n        "url": "http:\/\/localhost:65530\/content\/images\/test-image-about.png"\n/);
                rendered.string.should.match(/"image": {\n            "@type": "ImageObject",\n            "url": "http:\/\/localhost:65530\/content\/images\/test-author-image.png"\n/);
                rendered.string.should.match(/"description": "all about our site"/);

                done();
            }).catch(done);
        });

        it('returns structured data on static page with custom post structured data', function (done) {
            const renderObject = {
                post: posts[1]
            };

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/about/',
                    context: ['page'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/about\/" \/>/);
                rendered.string.should.match(/<meta name="referrer" content="no-referrer-when-downgrade" \/>/);
                rendered.string.should.match(/<meta name="description" content="all about our site" \/>/);
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
                rendered.string.should.match(/"image": {\n        "@type": "ImageObject",\n        "url": "http:\/\/localhost:65530\/content\/images\/test-image-about.png"/);
                rendered.string.should.match(/"image": {\n            "@type": "ImageObject",\n            "url": "http:\/\/localhost:65530\/content\/images\/test-author-image.png"\n/);
                rendered.string.should.match(/"description": "all about our site"/);

                done();
            }).catch(done);
        });

        it('returns structured data on post page with author image and post cover image', function (done) {
            const renderObject = {
                post: posts[2]
            };

            const postBk = _.cloneDeep(renderObject.post);

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                const re1 = new RegExp('<meta property="article:published_time" content="' + new Date(renderObject.post.published_at).toISOString());
                const re2 = new RegExp('<meta property="article:modified_time" content="' + new Date(renderObject.post.updated_at).toISOString());
                const re3 = new RegExp('"datePublished": "' + new Date(renderObject.post.published_at).toISOString());
                const re4 = new RegExp('"dateModified": "' + new Date(renderObject.post.updated_at).toISOString());

                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="site description" \/>/);
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
                rendered.string.should.match(/<meta name="twitter:description" content="site description" \/>/);
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
                rendered.string.should.match(/"image": {\n            "@type": "ImageObject",\n            "url": "http:\/\/localhost:65530\/content\/images\/test-author-image.png"\n/);
                rendered.string.should.match(/"url": "https:\/\/mysite.com\/fakeauthor\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.not.match(/"description": "Author bio"/);
                rendered.string.should.match(/"headline": "Welcome to Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/post\/"/);
                rendered.string.should.match(re3);
                rendered.string.should.match(re4);
                rendered.string.should.match(/"image": {\n        "@type": "ImageObject",\n        "url": "http:\/\/localhost:65530\/content\/images\/test-image.png"\n/);
                rendered.string.should.match(/"keywords": "tag1, tag2, tag3"/);
                rendered.string.should.match(/"description": "site description"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                renderObject.post.should.eql(postBk);

                done();
            }).catch(done);
        });

        it('returns structured data on post page with custom excerpt for description and meta description', function (done) {
            const renderObject = {
                post: posts[3]
            };

            const postBk = _.cloneDeep(renderObject.post);

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="site description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="post custom excerpt" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/test-facebook-image.png" \/>/);
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
                rendered.string.should.match(/"image": {\n            "@type": "ImageObject",\n            "url": "http:\/\/localhost:65530\/content\/images\/test-author-image.png"/);
                rendered.string.should.match(/"url": "https:\/\/mysite.com\/fakeauthor\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.not.match(/"description": "Author bio"/);
                rendered.string.should.match(/"headline": "Welcome to Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/post\/"/);
                rendered.string.should.match(/"image": {\n        "@type": "ImageObject",\n        "url": "http:\/\/localhost:65530\/content\/images\/test-image.png"/);
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
            const renderObject = {
                post: posts[4]
            };

            const postBk = _.cloneDeep(renderObject.post);

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.not.match(/<meta name="description" content="site description" \/>/);
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
                rendered.string.should.match(/"url": "https:\/\/mysite.com\/fakeauthor\/"/);
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
            const renderObject = {
                post: posts[5]
            };

            const postBk = _.cloneDeep(renderObject.post);

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/amp/',
                    context: ['amp', 'post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.not.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="site description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Custom Facebook title" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="site description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/test-facebook-image.png" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag1" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag2" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag3" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Custom Twitter title" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="site description" \/>/);
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
                rendered.string.should.match(/"image": {\n            "@type": "ImageObject",\n            "url": "http:\/\/localhost:65530\/content\/images\/test-author-image.png"/);
                rendered.string.should.match(/"url": "https:\/\/mysite.com\/fakeauthor\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.not.match(/"description": "Author bio"/);
                rendered.string.should.match(/"headline": "Welcome to Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/post\/"/);
                rendered.string.should.match(/"image": {\n        "@type": "ImageObject",\n        "url": "http:\/\/localhost:65530\/content\/images\/test-image.png"/);
                rendered.string.should.match(/"keywords": "tag1, tag2, tag3"/);
                rendered.string.should.match(/"description": "site description"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                renderObject.post.should.eql(postBk);

                done();
            }).catch(done);
        });

        it('returns structured data if metaTitle and metaDescription have double quotes', function (done) {
            const renderObject = {
                post: posts[6]
            };

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="site &quot;test&quot; description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Welcome to Ghost &quot;test&quot;" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="site &quot;test&quot; description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/test-image.png" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag1" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag2" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag3" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Welcome to Ghost &quot;test&quot;" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="site &quot;test&quot; description" \/>/);
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
                rendered.string.should.match(/"image": {\n            "@type": "ImageObject",\n            "url": "http:\/\/localhost:65530\/content\/images\/test-author-image.png"/);
                rendered.string.should.match(/"url": "https:\/\/mysite.com\/fakeauthor\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.match(/"headline": "Welcome to Ghost &quot;test&quot;"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/post\/"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"image": {\n        "@type": "ImageObject",\n        "url": "http:\/\/localhost:65530\/content\/images\/test-image.png"/);
                rendered.string.should.match(/"keywords": "tag1, tag2, tag3"/);
                rendered.string.should.match(/"description": "site &quot;test&quot; description"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('returns structured data without tags if there are no tags', function (done) {
            const renderObject = {
                post: posts[7]
            };

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="site description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="site description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/test-image.png" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.not.match(/<meta property="article:tag"/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="site description" \/>/);
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
                rendered.string.should.match(/"image": {\n            "@type": "ImageObject",\n            "url": "http:\/\/localhost:65530\/content\/images\/test-author-image.png"/);
                rendered.string.should.match(/"url": "https:\/\/mysite.com\/fakeauthor\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.match(/"headline": "Welcome to Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/post\/"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"image": {\n        "@type": "ImageObject",\n        "url": "http:\/\/localhost:65530\/content\/images\/test-image.png"/);
                rendered.string.should.not.match(/"keywords":/);
                rendered.string.should.match(/"description": "site description"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('returns structured data on post page with null author image and post cover image', function (done) {
            const renderObject = {
                post: posts[8]
            };

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="site description" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="site description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(/<meta property="og:image"/);
                rendered.string.should.match(/<meta property="article:tag" content="tag1" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag2" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag3" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="site description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:image"/);
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
                rendered.string.should.match(/"url": "https:\/\/mysite.com\/fakeauthor\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.match(/"headline": "Welcome to Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/post\/"/);
                rendered.string.should.match(/"keywords": "tag1, tag2, tag3"/);
                rendered.string.should.match(/"description": "site description"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('returns twitter and facebook descriptions even if no meta description available', function (done) {
            const renderObject = {
                post: posts[9]
            };

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.not.match(/<meta name="description" /);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="This is a short post" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="This is a short post" \/>/);

                done();
            }).catch(done);
        });

        it('returns canonical URL', function (done) {
            const renderObject = {
                post: posts[9]
            };

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/about/',
                    context: ['page'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/about\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('returns next & prev URL correctly for middle page', function (done) {
            ghost_head(testUtils.createHbsResponse({
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
            ghost_head(testUtils.createHbsResponse({
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

        it('returns structured data and schema first tag page with meta description and meta title', function (done) {
            const renderObject = {
                tag: tags[0]
            };

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/tag/tagtitle/',
                    context: ['tag'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
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
                rendered.string.should.match(/"image": {\n        "@type": "ImageObject",\n        "url": "http:\/\/localhost:65530\/content\/images\/tag-image.png"/);
                rendered.string.should.match(/"name": "tagtitle"/);
                rendered.string.should.match(/"description": "tag meta description"/);

                done();
            }).catch(done);
        });

        it('tag first page without meta data if no meta title and meta description, but model description provided', function (done) {
            const renderObject = {
                tag: tags[1]
            };

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/tag/tagtitle/',
                    context: ['tag'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/tag\/tagtitle\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="tag description"/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="tagtitle - Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="tag description"/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/tag\/tagtitle\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/tag-image.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="tagtitle - Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="tag description"/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/tag\/tagtitle\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/tag-image.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Series"/);
                rendered.string.should.match(/"publisher": {\n        "@type": "Organization",\n        "name": "Ghost",/);
                rendered.string.should.match(/"url": "http:\/\/localhost:65530\/tag\/tagtitle\/"/);
                rendered.string.should.match(/"image": {\n        "@type": "ImageObject",\n        "url": "http:\/\/localhost:65530\/content\/images\/tag-image.png"/);
                rendered.string.should.match(/"name": "tagtitle"/);

                done();
            }).catch(done);
        });

        it('tag first page without meta and model description returns no description fields', function (done) {
            const renderObject = {
                tag: tags[2]
            };

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/tag/tagtitle/',
                    context: ['tag'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.not.match(/<meta name="description"/);
                rendered.string.should.not.match(/<meta property="og:description"/);
                rendered.string.should.not.match(/<meta name="twitter:description"/);
                rendered.string.should.not.match(/"description":/);

                done();
            }).catch(done);
        });

        it('does not return structured data on paginated tag pages', function (done) {
            const renderObject = {
                tag: tags[3]
            };

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/tag/tagtitle/page/2/',
                    context: ['paged', 'tag'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
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
            ghost_head(testUtils.createHbsResponse({
                renderObject: {author: users[0]},
                locals: {
                    // @TODO: WHY?
                    relativeUrl: '/author/authorname/',
                    context: ['author'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/author\/authorname\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="Author bio"/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="profile" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="Author bio"/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/localhost:65530\/author\/authorname\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/localhost:65530\/content\/images\/author-cover-image.png" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser\" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Author name - Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="Author bio"/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/localhost:65530\/author\/authorname\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/localhost:65530\/content\/images\/author-cover-image.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Person"/);
                rendered.string.should.match(/"sameAs": \[\n        "http:\/\/authorwebsite.com",\n        "https:\/\/www.facebook.com\/testuser",\n        "https:\/\/twitter.com\/testuser"\n    \]/);
                rendered.string.should.match(/"url": "https:\/\/mysite.com\/fakeauthor\/"/);
                rendered.string.should.match(/"image": {\n        "@type": "ImageObject",\n        "url": "http:\/\/localhost:65530\/content\/images\/author-cover-image.png"/);
                rendered.string.should.match(/"name": "Author name"/);

                done();
            }).catch(done);
        });

        it('does not return structured data on paginated author pages', function (done) {
            ghost_head(testUtils.createHbsResponse({
                renderObject: {author: users[1]},
                locals: {
                    // @TODO: WHY?
                    relativeUrl: '/author/authorname1/page/2/',
                    context: ['paged', 'author'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/author\/authorname1\/page\/2\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta name="description" /);
                rendered.string.should.not.match(/<meta property="og/);
                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });

        it('returns meta tag string even if safeVersion is invalid', function (done) {
            ghost_head(testUtils.createHbsResponse({
                locals: {
                    context: [],
                    safeVersion: '0.9'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.9" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('disallows indexing for preview pages', function (done) {
            ghost_head(testUtils.createHbsResponse({
                locals: {
                    context: ['preview', 'post']
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<meta name="robots" content="noindex,nofollow" \/>/);

                done();
            }).catch(done);
        });

        it('implicit indexing settings for non-preview pages', function (done) {
            ghost_head(testUtils.createHbsResponse({
                locals: {
                    context: ['featured', 'paged', 'index', 'post', 'amp', 'home', 'unicorn']
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.not.match(/<meta name="robots" content="noindex,nofollow" \/>/);

                done();
            }).catch(done);
        });

        it('outputs structured data but not schema for custom collection', function (done) {
            ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/featured/',
                    context: ['featured'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
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
    });

    describe('with /site subdirectory', function () {
        beforeEach(function () {
            settingsCache.get.withArgs('icon').returns('/content/images/favicon.png');

            configUtils.set({url: 'http://localhost:65530/site'});

            routing.registry.getRssUrl.returns('http://localhost:65530/site/rss/');
        });

        afterEach(function () {
            routing.registry.getRssUrl.returns('http://localhost:65530/rss/');
        });

        it('returns correct rss url with subdirectory', function (done) {
            ghost_head(testUtils.createHbsResponse({
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="icon" href="\/site\/content\/images\/size\/w256h256\/favicon.png" type="image\/png" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/site\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/site\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta name="description" /);

                done();
            }).catch(done);
        });
    });

    describe('with changed origin in config file', function () {
        beforeEach(function () {
            settingsCache.get.withArgs('icon').returns('/content/images/favicon.png');

            configUtils.set({
                url: 'http://localhost:65530/site',
                referrerPolicy: 'origin'
            });
        });

        it('contains the changed origin', function (done) {
            ghost_head(testUtils.createHbsResponse({
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="icon" href="\/site\/content\/images\/size\/w256h256\/favicon.png" type="image\/png" \/>/);
                rendered.string.should.match(/<meta name="referrer" content="origin" \/>/);
                rendered.string.should.not.match(/<meta name="description" /);

                done();
            }).catch(done);
        });
    });

    describe('with useStructuredData is set to false in config file', function () {
        beforeEach(function () {
            settingsCache.get.withArgs('icon').returns('/content/images/favicon.png');

            configUtils.set({
                url: 'http://localhost:65530/',
                privacy: {
                    useStructuredData: false
                }
            });
        });

        it('does not return structured data', function (done) {
            const renderObject = {
                post: posts[2]
            };

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="icon" href="\/content\/images\/size\/w256h256\/favicon.png" type="image\/png" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/post\/" \/>/);
                rendered.string.should.match(/<link rel="amphtml" href="http:\/\/localhost:65530\/post\/amp\/" \/>/);
                rendered.string.should.match(/<meta name="description" content="site description" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta property="og/);
                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });
    });

    describe('with Code Injection', function () {
        beforeEach(function () {
            settingsCache.get.withArgs('icon').returns('/content/images/favicon.png');
            settingsCache.get.withArgs('codeinjection_head').returns('<style>body {background: red;}</style>');

            configUtils.set({url: 'http://localhost:65530/'});
        });

        it('returns meta tag plus injected code', function (done) {
            ghost_head(testUtils.createHbsResponse({
                renderObject: {
                    post: false
                },
                locals: {
                    context: ['paged', 'index'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="icon" href="\/content\/images\/size\/w256h256\/favicon.png" type="image\/png" \/>/);
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
            ghost_head(testUtils.createHbsResponse({
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
            ghost_head(testUtils.createHbsResponse({
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
            ghost_head(testUtils.createHbsResponse({
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
            const renderObject = {
                post: posts[1]
            };

            ghost_head(testUtils.createHbsResponse({
                renderObject: renderObject,
                locals: {
                    context: ['amp', 'post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="icon" href="\/content\/images\/size\/w256h256\/favicon.png" type="image\/png" \/>/);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/localhost:65530\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/localhost:65530\/rss\/" \/>/);
                rendered.string.should.not.match(/<style>body {background: red;}<\/style>/);

                done();
            }).catch(done);
        });
    });

    describe('amp is disabled', function () {
        beforeEach(function () {
            settingsCache.get.withArgs('amp').returns(false);
        });

        it('does not contain amphtml link', function (done) {
            const renderObject = {
                post: posts[1]
            };

            ghost_head(testUtils.createHbsResponse({
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

    describe('accent_color', function () {
        it('includes style tag when set', function (done) {
            const renderObject = {
                post: posts[1]
            };

            const templateOptions = {
                site: {
                    accent_color: '#123456'
                }
            };

            ghost_head(testUtils.createHbsResponse({
                templateOptions,
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.containEql('<style>:root {--ghost-accent-color: #123456;}</style>');
                done();
            }).catch(done);
        });

        it('does not include style tag when not set', function (done) {
            const renderObject = {
                post: posts[1]
            };

            const templateOptions = {
                site: {
                    accent_color: null
                }
            };

            ghost_head(testUtils.createHbsResponse({
                templateOptions,
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.not.containEql('--ghost-accent-color');
                done();
            }).catch(done);
        });

        it('attaches style tag to existing script/style tag', function (done) {
            settingsCache.get.withArgs('members_enabled').returns(true);
            
            const renderObject = {
                post: posts[1]
            };

            const templateOptions = {
                site: {
                    accent_color: '#123456'
                }
            };

            ghost_head(testUtils.createHbsResponse({
                templateOptions,
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/[^\s]<style>:root/);
                done();
            }).catch(done);
        });

        it('includes style tag on templates with no context', function (done) {
            const renderObject = {
                post: posts[1]
            };

            const templateOptions = {
                site: {
                    accent_color: '#123456'
                }
            };

            ghost_head(testUtils.createHbsResponse({
                templateOptions,
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/amp/',
                    context: null,
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.containEql('<style>:root {--ghost-accent-color: #123456;}</style>');
                done();
            }).catch(done);
        });

        it('does not include style tag in AMP context', function (done) {
            const renderObject = {
                post: posts[1]
            };

            const templateOptions = {
                site: {
                    accent_color: '#123456'
                }
            };

            ghost_head(testUtils.createHbsResponse({
                templateOptions,
                renderObject: renderObject,
                locals: {
                    relativeUrl: '/post/',
                    context: ['post', 'amp'],
                    safeVersion: '0.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.not.containEql('--ghost-accent-color');
                done();
            }).catch(done);
        });
    });

    describe('members scripts', function () {
        it('includes portal when members enabled', function (done) {
            settingsCache.get.withArgs('members_enabled').returns(true);

            ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.containEql('<script defer src="https://unpkg.com/@tryghost/portal');
                rendered.string.should.containEql('data-ghost="http://127.0.0.1:2369/" data-key="xyz" data-api="http://127.0.0.1:2369/ghost/api/content/"');
                rendered.string.should.containEql('<style id="gh-members-styles">');
                done();
            }).catch(done);
        });

        it('includes stripe when connected', function (done) {
            settingsCache.get.withArgs('members_enabled').returns(true);
            settingsCache.get.withArgs('paid_members_enabled').returns(true);

            ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.containEql('<script defer src="https://unpkg.com/@tryghost/portal');
                rendered.string.should.containEql('data-ghost="http://127.0.0.1:2369/" data-key="xyz" data-api="http://127.0.0.1:2369/ghost/api/content/"');
                rendered.string.should.containEql('<style id="gh-members-styles">');
                rendered.string.should.containEql('<script async src="https://js.stripe.com');
                done();
            }).catch(done);
        });

        it('skips portal and stripe when members are disabled', function (done) {
            settingsCache.get.withArgs('members_enabled').returns(false);
            settingsCache.get.withArgs('paid_members_enabled').returns(true);

            ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.not.containEql('<script defer src="https://unpkg.com/@tryghost/portal');
                rendered.string.should.not.containEql('data-ghost="http://127.0.0.1:2369/" data-key="xyz" data-api="http://127.0.0.1:2369/ghost/api/content/"');
                rendered.string.should.not.containEql('<style id="gh-members-styles">');
                rendered.string.should.not.containEql('<script async src="https://js.stripe.com');
                done();
            }).catch(done);
        });

        it('skips stripe if not set up', function (done) {
            settingsCache.get.withArgs('members_enabled').returns(true);
            settingsCache.get.withArgs('paid_members_enabled').returns(false);

            ghost_head(testUtils.createHbsResponse({
                locals: {
                    relativeUrl: '/',
                    context: ['home', 'index'],
                    safeVersion: '4.3'
                }
            })).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.containEql('<script defer src="https://unpkg.com/@tryghost/portal');
                rendered.string.should.containEql('data-ghost="http://127.0.0.1:2369/" data-key="xyz" data-api="http://127.0.0.1:2369/ghost/api/content/"');
                rendered.string.should.containEql('<style id="gh-members-styles">');
                rendered.string.should.not.containEql('<script async src="https://js.stripe.com');
                done();
            }).catch(done);
        });
    });
});
