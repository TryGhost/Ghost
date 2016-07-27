var should         = require('should'),
    sinon          = require('sinon'),
    _              = require('lodash'),
    Promise        = require('bluebird'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),
    configUtils    = require('../../utils/configUtils'),
    moment         = require('moment'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers'),
    api            = require('../../../server/api'),

    labs           = require('../../../server/utils/labs'),

    sandbox = sinon.sandbox.create();

describe('{{ghost_head}} helper', function () {
    var settingsReadStub;

    before(function () {
        utils.loadHelpers();
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    beforeEach(function () {
        settingsReadStub = sandbox.stub(api.settings, 'read').returns(new Promise.resolve({
            settings: [
                {value: ''}
            ]
        }));

        sandbox.stub(api.clients, 'read').returns(new Promise.resolve({
            clients: [
                {slug: 'ghost-frontend', secret: 'a1bcde23cfe5', status: 'enabled'}
            ]
        }));

        sandbox.stub(labs, 'isSet').returns(true);
    });

    describe('without Code Injection', function () {
        beforeEach(function () {
            configUtils.set({
                url: 'http://testurl.com/',
                theme: {
                    title: 'Ghost',
                    description: 'blog description',
                    cover: '/content/images/blog-cover.png'
                }
            });
        });

        it('has loaded ghost_head helper', function () {
            should.exist(handlebars.helpers.ghost_head);
        });

        it('returns meta tag string on paginated index page without structured data and schema', function (done) {
            helpers.ghost_head.call(
                {safeVersion: '0.3', relativeUrl: '/page/2/', context: ['paged', 'index']},
                {data: {root: {context: ['paged', 'index']}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/page\/2\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta property="og/);
                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });

        it('returns structured data on first index page', function (done) {
            helpers.ghost_head.call(
                {safeVersion: '0.3', relativeUrl: '/', context: ['home', 'index']},
                {data: {root: {context: ['home', 'index']}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/" \/>/);
                rendered.string.should.match(/<meta name="referrer" content="origin-when-cross-origin" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/testurl.com\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/testurl.com\/content\/images\/blog-cover.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/testurl.com\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/testurl.com\/content\/images\/blog-cover.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Website"/);
                rendered.string.should.match(/"publisher": "Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/testurl.com\/"/);
                rendered.string.should.match(/"image": "http:\/\/testurl.com\/content\/images\/blog-cover.png"/);
                rendered.string.should.match(/"description": "blog description"/);

                done();
            }).catch(done);
        });

        it('returns structured data on static page', function (done) {
            var post = {
                meta_description: 'all about our blog',
                title: 'About',
                image: '/content/images/test-image-about.png',
                published_at:  moment('2008-05-31T19:18:15').toISOString(),
                updated_at: moment('2014-10-06T15:23:54').toISOString(),
                page: true,
                author: {
                    name: 'Author name',
                    url: 'http://testauthorurl.com',
                    slug: 'Author',
                    image: '/content/images/test-author-image.png',
                    website: 'http://authorwebsite.com',
                    facebook: 'testuser',
                    twitter: '@testuser',
                    bio: 'Author bio'
                }
            };

            helpers.ghost_head.call(
                {safeVersion: '0.3', relativeUrl: '/about/', context: ['page'], post: post},
                {data: {root: {context: ['page']}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/about\/" \/>/);
                rendered.string.should.match(/<meta name="referrer" content="origin-when-cross-origin" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="About" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="all about our blog" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/testurl.com\/about\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/testurl.com\/content\/images\/test-image-about.png" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="About" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="all about our blog" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/testurl.com\/about\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/testurl.com\/content\/images\/test-image-about.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Article"/);
                rendered.string.should.match(/"publisher": {/);
                rendered.string.should.match(/"@type": "Organization"/);
                rendered.string.should.match(/"name": "Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/testurl.com\/about\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.match(/"image": "http:\/\/testurl.com\/content\/images\/test-image-about.png"/);
                rendered.string.should.match(/"image\": \"http:\/\/testurl.com\/content\/images\/test-author-image.png\"/);
                rendered.string.should.match(/"description": "all about our blog"/);

                done();
            }).catch(done);
        });

        it('returns structured data and schema first tag page with meta description and meta title', function (done) {
            var tag = {
                meta_description: 'tag meta description',
                name: 'tagtitle',
                meta_title: 'tag meta title',
                image: '/content/images/tag-image.png'
            };

            helpers.ghost_head.call(
                {safeVersion: '0.3', relativeUrl: '/tag/tagtitle/', tag: tag, context: ['tag']},
                {data: {root: {context: ['tag']}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/tag\/tagtitle\/" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="tag meta title" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="tag meta description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/testurl.com\/tag\/tagtitle\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/testurl.com\/content\/images\/tag-image.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="tag meta title" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="tag meta description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/testurl.com\/tag\/tagtitle\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/testurl.com\/content\/images\/tag-image.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Series"/);
                rendered.string.should.match(/"publisher": "Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/testurl.com\/tag\/tagtitle\/"/);
                rendered.string.should.match(/"image": "http:\/\/testurl.com\/content\/images\/tag-image.png"/);
                rendered.string.should.match(/"name": "tagtitle"/);
                rendered.string.should.match(/"description": "tag meta description"/);

                done();
            }).catch(done);
        });

        it('tag first page without meta description uses tag description, and title if no meta title', function (done) {
            var tag = {
                meta_description: '',
                description: 'tag description',
                name: 'tagtitle',
                meta_title: '',
                image: '/content/images/tag-image.png'
            };

            helpers.ghost_head.call(
                {safeVersion: '0.3', relativeUrl: '/tag/tagtitle/', tag: tag, context: ['tag']},
                {data: {root: {context: ['tag']}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/tag\/tagtitle\/" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="tagtitle - Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="tag description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/testurl.com\/tag\/tagtitle\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/testurl.com\/content\/images\/tag-image.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="tagtitle - Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="tag description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/testurl.com\/tag\/tagtitle\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/testurl.com\/content\/images\/tag-image.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Series"/);
                rendered.string.should.match(/"publisher": "Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/testurl.com\/tag\/tagtitle\/"/);
                rendered.string.should.match(/"image": "http:\/\/testurl.com\/content\/images\/tag-image.png"/);
                rendered.string.should.match(/"name": "tagtitle"/);
                rendered.string.should.match(/"description": "tag description"/);

                done();
            }).catch(done);
        });

        it('tag first page with meta and model description returns no description fields', function (done) {
            var tag = {
                meta_description: '',
                name: 'tagtitle',
                meta_title: '',
                image: '/content/images/tag-image.png'
            };

            helpers.ghost_head.call(
                {safeVersion: '0.3', relativeUrl: '/tag/tagtitle/', tag: tag, context: ['tag']},
                {data: {root: {context: ['tag']}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.not.match(/<meta property="og:description" \/>/);
                rendered.string.should.not.match(/<meta name="twitter:description"\/>/);
                rendered.string.should.not.match(/"description":/);

                done();
            }).catch(done);
        });

        it('does not return structured data on paginated tag pages', function (done) {
            var tag = {
                meta_description: 'tag meta description',
                title: 'tagtitle',
                meta_title: 'tag meta title',
                image: '/content/images/tag-image.png'
            };

            helpers.ghost_head.call(
                {safeVersion: '0.3', relativeUrl: '/tag/tagtitle/page/2/', tag: tag, context: ['paged', 'tag']},
                {data: {root: {context: ['tag']}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/tag\/tagtitle\/page\/2\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta property="og/);
                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });

        it('returns structured data and schema on first author page with cover image', function (done) {
            var author = {
                name: 'Author name',
                slug: 'AuthorName',
                bio: 'Author bio',
                image: '/content/images/test-author-image.png',
                cover: '/content/images/author-cover-image.png',
                website: 'http://authorwebsite.com',
                facebook: 'testuser',
                twitter: '@testuser'
            }, authorBk = _.cloneDeep(author);

            helpers.ghost_head.call(
                {safeVersion: '0.3', relativeUrl: '/author/AuthorName/', author: author, context: ['author']},
                {data: {root: {context: ['author']}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/author\/AuthorName\/" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="profile" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="Author bio" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/testurl.com\/author\/AuthorName\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/testurl.com\/content\/images\/author-cover-image.png" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser\" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Author name - Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="Author bio" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/testurl.com\/author\/AuthorName\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/testurl.com\/content\/images\/author-cover-image.png" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Person"/);
                rendered.string.should.match(/"sameAs": \[\n        "http:\/\/authorwebsite.com",\n        "https:\/\/www.facebook.com\/testuser",\n        "https:\/\/twitter.com\/testuser"\n    \]/);
                rendered.string.should.match(/"url": "http:\/\/testurl.com\/author\/AuthorName\/"/);
                rendered.string.should.match(/"image": "http:\/\/testurl.com\/content\/images\/author-cover-image.png"/);
                rendered.string.should.match(/"name": "Author name"/);
                rendered.string.should.match(/"description": "Author bio"/);

                author.should.eql(authorBk);

                done();
            }).catch(done);
        });

        it('does not return structured data on paginated author pages', function (done) {
            var author = {
                name: 'Author name',
                slug: 'AuthorName',
                bio: 'Author bio',
                image: '/content/images/test-author-image.png',
                cover: '/content/images/author-cover-image.png',
                website: 'http://authorwebsite.com'
            };

            helpers.ghost_head.call(
                {safeVersion: '0.3', relativeUrl: '/author/AuthorName/page/2/', author: author, context: ['paged', 'author']},
                {data: {root: {context: ['paged', 'author']}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/author\/AuthorName\/page\/2\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta property="og/);
                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });

        it('returns meta tag string even if safeVersion is invalid', function (done) {
            helpers.ghost_head.call(
                {safeVersion: '0.9', context: []},
                {data: {root: {context: []}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.9" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('returns structured data on post page with author image and post cover image', function (done) {
            var post = {
                meta_description: 'blog description',
                title: 'Welcome to Ghost',
                image: '/content/images/test-image.png',
                published_at:  moment('2008-05-31T19:18:15').toISOString(),
                updated_at: moment('2014-10-06T15:23:54').toISOString(),
                tags: [{name: 'tag1'}, {name: 'tag2'}, {name: 'tag3'}],
                author: {
                    name: 'Author name',
                    url: 'http://testauthorurl.com',
                    slug: 'Author',
                    image: '/content/images/test-author-image.png',
                    website: 'http://authorwebsite.com',
                    bio: 'Author bio',
                    facebook: 'testuser',
                    twitter: '@testuser'
                }
            }, postBk = _.cloneDeep(post);

            helpers.ghost_head.call(
                {relativeUrl: '/post/', safeVersion: '0.3', context: ['post'], post: post},
                {data: {root: {context: ['post']}}}
            ).then(function (rendered) {
                var re1 = new RegExp('<meta property="article:published_time" content="' + post.published_at),
                    re2 = new RegExp('<meta property="article:modified_time" content="' + post.updated_at),
                    re3 = new RegExp('"datePublished": "' + post.published_at),
                    re4 = new RegExp('"dateModified": "' + post.updated_at);

                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/testurl.com\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/testurl.com\/content\/images\/test-image.png" \/>/);
                rendered.string.should.match(re1);
                rendered.string.should.match(re2);
                rendered.string.should.match(/<meta property="article:tag" content="tag1" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag2" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag3" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/testurl.com\/post\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/testurl.com\/content\/images\/test-image.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Article"/);
                rendered.string.should.match(/"publisher": {/);
                rendered.string.should.match(/"@type": "Organization"/);
                rendered.string.should.match(/"name": "Ghost"/);
                rendered.string.should.match(/"author": {/);
                rendered.string.should.match(/"@type": "Person"/);
                rendered.string.should.match(/"name": "Author name"/);
                rendered.string.should.match(/"image\": \"http:\/\/testurl.com\/content\/images\/test-author-image.png\"/);
                rendered.string.should.match(/"url": "http:\/\/testurl.com\/author\/Author\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.match(/"description": "Author bio"/);
                rendered.string.should.match(/"headline": "Welcome to Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/testurl.com\/post\/"/);
                rendered.string.should.match(re3);
                rendered.string.should.match(re4);
                rendered.string.should.match(/"image": "http:\/\/testurl.com\/content\/images\/test-image.png"/);
                rendered.string.should.match(/"keywords": "tag1, tag2, tag3"/);
                rendered.string.should.match(/"description": "blog description"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);

                post.should.eql(postBk);

                done();
            }).catch(done);
        });

        it('returns structured data if metaTitle and metaDescription have double quotes', function (done) {
            var post = {
                meta_description: 'blog "test" description',
                title: 'title',
                meta_title: 'Welcome to Ghost "test"',
                image: '/content/images/test-image.png',
                published_at:  moment('2008-05-31T19:18:15').toISOString(),
                updated_at: moment('2014-10-06T15:23:54').toISOString(),
                tags: [{name: 'tag1'}, {name: 'tag2'}, {name: 'tag3'}],
                author: {
                    name: 'Author name',
                    url: 'http//:testauthorurl.com',
                    slug: 'Author',
                    image: '/content/images/test-author-image.png',
                    website: 'http://authorwebsite.com',
                    facebook: 'testuser',
                    twitter: '@testuser'
                }
            };

            helpers.ghost_head.call(
                {relativeUrl: '/post/', safeVersion: '0.3', context: ['post'], post: post},
                {data: {root: {context: ['post']}}}
            ).then(function (rendered) {
                var re1 = new RegExp('<meta property="article:published_time" content="' + post.published_at),
                    re2 = new RegExp('<meta property="article:modified_time" content="' + post.updated_at),
                    re3 = new RegExp('"datePublished": "' + post.published_at),
                    re4 = new RegExp('"dateModified": "' + post.updated_at);

                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Welcome to Ghost &quot;test&quot;" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="blog &quot;test&quot; description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/testurl.com\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/testurl.com\/content\/images\/test-image.png" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(re1);
                rendered.string.should.match(re2);
                rendered.string.should.match(/<meta property="article:tag" content="tag1" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag2" \/>/);
                rendered.string.should.match(/<meta property="article:tag" content="tag3" \/>/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Welcome to Ghost &quot;test&quot;" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="blog &quot;test&quot; description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/testurl.com\/post\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/testurl.com\/content\/images\/test-image.png" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Article"/);
                rendered.string.should.match(/"publisher": {/);
                rendered.string.should.match(/"@type": "Organization"/);
                rendered.string.should.match(/"name": "Ghost"/);
                rendered.string.should.match(/"author": {/);
                rendered.string.should.match(/"@type": "Person"/);
                rendered.string.should.match(/"name": "Author name"/);
                rendered.string.should.match(/"image\": \"http:\/\/testurl.com\/content\/images\/test-author-image.png\"/);
                rendered.string.should.match(/"url": "http:\/\/testurl.com\/author\/Author\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.match(/"headline": "Welcome to Ghost &quot;test&quot;"/);
                rendered.string.should.match(/"url": "http:\/\/testurl.com\/post\/"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(re3);
                rendered.string.should.match(re4);
                rendered.string.should.match(/"image": "http:\/\/testurl.com\/content\/images\/test-image.png"/);
                rendered.string.should.match(/"keywords": "tag1, tag2, tag3"/);
                rendered.string.should.match(/"description": "blog &quot;test&quot; description"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('returns structured data without tags if there are no tags', function (done) {
            var post = {
                meta_description: 'blog description',
                title: 'Welcome to Ghost',
                image: '/content/images/test-image.png',
                published_at:  moment('2008-05-31T19:18:15').toISOString(),
                updated_at: moment('2014-10-06T15:23:54').toISOString(),
                tags: [],
                author: {
                    name: 'Author name',
                    url: 'http//:testauthorurl.com',
                    slug: 'Author',
                    image: '/content/images/test-author-image.png',
                    website: 'http://authorwebsite.com',
                    facebook: 'testuser',
                    twitter: '@testuser'
                }
            };

            helpers.ghost_head.call(
                {relativeUrl: '/post/', safeVersion: '0.3', context: ['post'], post: post},
                {data: {root: {context: ['post']}}}).then(function (rendered) {
                var re1 = new RegExp('<meta property="article:published_time" content="' + post.published_at),
                    re2 = new RegExp('<meta property="article:modified_time" content="' + post.updated_at),
                    re3 = new RegExp('"datePublished": "' + post.published_at),
                    re4 = new RegExp('"dateModified": "' + post.updated_at);

                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/testurl.com\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:image" content="http:\/\/testurl.com\/content\/images\/test-image.png" \/>/);
                rendered.string.should.match(/<meta property="article:author" content="https:\/\/www.facebook.com\/testuser" \/>/);
                rendered.string.should.match(re1);
                rendered.string.should.match(re2);
                rendered.string.should.not.match(/<meta property="article:tag"/);
                rendered.string.should.match(/<meta name="twitter:card" content="summary_large_image" \/>/);
                rendered.string.should.match(/<meta name="twitter:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/testurl.com\/post\/" \/>/);
                rendered.string.should.match(/<meta name="twitter:image" content="http:\/\/testurl.com\/content\/images\/test-image.png" \/>/);
                rendered.string.should.match(/<meta name="twitter:creator" content="@testuser" \/>/);
                rendered.string.should.match(/<script type=\"application\/ld\+json\">/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/"@type": "Article"/);
                rendered.string.should.match(/"publisher": {/);
                rendered.string.should.match(/"@type": "Organization"/);
                rendered.string.should.match(/"author": {/);
                rendered.string.should.match(/"@type": "Person"/);
                rendered.string.should.match(/"name": "Author name"/);
                rendered.string.should.match(/"image\": \"http:\/\/testurl.com\/content\/images\/test-author-image.png\"/);
                rendered.string.should.match(/"url": "http:\/\/testurl.com\/author\/Author\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.match(/"headline": "Welcome to Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/testurl.com\/post\/"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(re3);
                rendered.string.should.match(re4);
                rendered.string.should.match(/"image": "http:\/\/testurl.com\/content\/images\/test-image.png"/);
                rendered.string.should.not.match(/"keywords":/);
                rendered.string.should.match(/"description": "blog description"/);
                rendered.string.should.match(/"@context": "https:\/\/schema.org"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('returns structured data on post page with null author image and post cover image', function (done) {
            var post = {
                meta_description: 'blog description',
                title: 'Welcome to Ghost',
                image: null,
                published_at:  moment('2008-05-31T19:18:15').toISOString(),
                updated_at: moment('2014-10-06T15:23:54').toISOString(),
                tags: [{name: 'tag1'}, {name: 'tag2'}, {name: 'tag3'}],
                author: {
                    name: 'Author name',
                    url: 'http//:testauthorurl.com',
                    slug: 'Author',
                    image: null,
                    website: 'http://authorwebsite.com',
                    facebook: 'testuser',
                    twitter: '@testuser'
                }
            };

            helpers.ghost_head.call(
                {relativeUrl: '/post/', safeVersion: '0.3', context: ['post'], post: post},
                {data: {root: {context: ['post']}}}
            ).then(function (rendered) {
                var re1 = new RegExp('<meta property="article:published_time" content="' + post.published_at),
                    re2 = new RegExp('<meta property="article:modified_time" content="' + post.updated_at),
                    re3 = new RegExp('"datePublished": "' + post.published_at),
                    re4 = new RegExp('"dateModified": "' + post.updated_at);

                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/post\/" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="article" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Welcome to Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:description" content="blog description" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/testurl.com\/post\/" \/>/);
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
                rendered.string.should.match(/<meta name="twitter:url" content="http:\/\/testurl.com\/post\/" \/>/);
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
                rendered.string.should.match(/"url": "http:\/\/testurl.com\/author\/Author\/"/);
                rendered.string.should.match(/"sameAs": \[\n            "http:\/\/authorwebsite.com",\n            "https:\/\/www.facebook.com\/testuser",\n            "https:\/\/twitter.com\/testuser"\n        \]/);
                rendered.string.should.match(/"headline": "Welcome to Ghost"/);
                rendered.string.should.match(/"url": "http:\/\/testurl.com\/post\/"/);
                rendered.string.should.match(re3);
                rendered.string.should.match(re4);
                rendered.string.should.match(/"keywords": "tag1, tag2, tag3"/);
                rendered.string.should.match(/"description": "blog description"/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('outputs structured data but not schema for custom channel', function (done) {
            helpers.ghost_head.call(
                {safeVersion: '0.3', relativeUrl: '/featured/', context: ['featured']},
                {data: {root: {context: ['featured']}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/featured\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);
                rendered.string.should.match(/<meta property="og:site_name" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:type" content="website" \/>/);
                rendered.string.should.match(/<meta property="og:title" content="Ghost" \/>/);
                rendered.string.should.match(/<meta property="og:url" content="http:\/\/testurl.com\/featured\/" \/>/);

                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });

        it('returns twitter and facebook descriptions if no meta description available', function (done) {
            var post = {
                title: 'Welcome to Ghost',
                html: '<p>This is a short post</p>',
                author: {
                    name: 'Author name'
                }
            };

            helpers.ghost_head.call(
                {relativeUrl: '/post/', safeVersion: '0.3', context: ['post'], post: post},
                {data: {root: {context: ['post']}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<meta property="og:description" content="This is a short post" \/>/);
                rendered.string.should.match(/<meta name="twitter:description" content="This is a short post" \/>/);

                done();
            }).catch(done);
        });

        it('returns canonical URL', function (done) {
            var post = {
                title: 'Welcome to Ghost',
                html: '<p>This is a short post</p>',
                author: {
                    name: 'Author name'
                }
            };

            helpers.ghost_head.call(
                {safeVersion: '0.3', relativeUrl: '/about/', context: ['page'], post: post},
                {data: {root: {context: ['page']}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/about\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);

                done();
            }).catch(done);
        });

        it('returns next & prev URL correctly for middle page', function (done) {
            helpers.ghost_head.call(
                {safeVersion: '0.3', relativeUrl: '/page/3/', context: ['paged', 'index'], pagination: {next: '4', prev: '2'}},
                {data: {root: {context: ['index', 'paged'], pagination: {total: 4, page: 3, next: 4, prev: 2}}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/page\/3\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="prev" href="http:\/\/testurl.com\/page\/2\/" \/>/);
                rendered.string.should.match(/<link rel="next" href="http:\/\/testurl.com\/page\/4\/" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta property="og/);
                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });

        it('returns next & prev URL correctly for second page', function (done) {
            helpers.ghost_head.call(
                {safeVersion: '0.3', relativeUrl: '/page/2/', context: ['paged', 'index'], pagination: {next: '3', prev: '1'}},
                {data: {root: {context: ['index', 'paged'], pagination: {total: 3, page: 2, next: 3, prev: 1}}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/page\/2\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="prev" href="http:\/\/testurl.com\/" \/>/);
                rendered.string.should.match(/<link rel="next" href="http:\/\/testurl.com\/page\/3\/" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta property="og/);
                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });

        describe('with /blog subdirectory', function () {
            beforeEach(function () {
                configUtils.set({
                    url: 'http://testurl.com/blog/',
                    theme: {
                        title: 'Ghost',
                        description: 'blog description',
                        cover: '/content/images/blog-cover.png'
                    }
                });
            });

            it('returns correct rss url with subdirectory', function (done) {
                helpers.ghost_head.call(
                    {safeVersion: '0.3', context: ['paged', 'index']},
                    {data: {root: {context: []}}}
                ).then(function (rendered) {
                    should.exist(rendered);
                    rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/blog\/" \/>/);
                    rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                    rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/blog\/rss\/" \/>/);

                    done();
                }).catch(done);
            });
        });
    });

    describe('with changed origin in config file', function () {
        beforeEach(function () {
            configUtils.set({
                url: 'http://testurl.com/blog/',
                theme: {
                    title: 'Ghost',
                    description: 'blog description',
                    cover: '/content/images/blog-cover.png'
                },
                referrerPolicy: 'origin'
            });
        });

        it('contains the changed origin', function (done) {
            helpers.ghost_head.call(
                {safeVersion: '0.3', context: ['paged', 'index']},
                {data: {root: {context: []}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<meta name="referrer" content="origin" \/>/);

                done();
            }).catch(done);
        });
    });

    describe('with useStructuredData is set to false in config file', function () {
        beforeEach(function () {
            configUtils.set({
                url: 'http://testurl.com/',
                theme: {
                    title: 'Ghost',
                    description: 'blog description',
                    cover: '/content/images/blog-cover.png'
                },
                privacy: {
                    useStructuredData: false
                }
            });
        });

        it('does not return structured data', function (done) {
            var post = {
                meta_description: 'blog description',
                title: 'Welcome to Ghost',
                image: 'content/images/test-image.png',
                published_at:  moment('2008-05-31T19:18:15').toISOString(),
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
            };

            helpers.ghost_head.call(
                {relativeUrl: '/post/', safeVersion: '0.3', context: ['post'], post: post},
                {data: {root: {context: ['post']}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/post\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);
                rendered.string.should.not.match(/<meta property="og/);
                rendered.string.should.not.match(/<script type=\"application\/ld\+json\">/);

                done();
            }).catch(done);
        });
    });

    describe('with Code Injection', function () {
        beforeEach(function () {
            settingsReadStub.returns(new Promise.resolve({
                settings: [{value: '<style>body {background: red;}</style>'}]
            }));

            configUtils.set({
                url: 'http://testurl.com/',
                theme: {
                    title: 'Ghost',
                    description: 'blog description',
                    cover: '/content/images/blog-cover.png'
                }
            });
        });

        it('returns meta tag plus injected code', function (done) {
            helpers.ghost_head.call(
                {safeVersion: '0.3', context: ['paged', 'index'], post: false},
                {data: {root: {context: []}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<link rel="canonical" href="http:\/\/testurl.com\/" \/>/);
                rendered.string.should.match(/<meta name="generator" content="Ghost 0.3" \/>/);
                rendered.string.should.match(/<link rel="alternate" type="application\/rss\+xml" title="Ghost" href="http:\/\/testurl.com\/rss\/" \/>/);
                rendered.string.should.match(/<style>body {background: red;}<\/style>/);

                done();
            }).catch(done);
        });
    });

    describe('with Ajax Helper', function () {
        it('renders script tag with src', function (done) {
            helpers.ghost_head.call(
                {safeVersion: '0.3', context: ['paged', 'index'], post: false},
                {data: {root: {context: []}}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<script type="text\/javascript" src="\/shared\/ghost-url\.js\?v=/);

                done();
            });
        });

        it('renders script tag with init correctly', function (done) {
            helpers.ghost_head.call(
                {safeVersion: '0.3', context: ['paged', 'index'], post: false},
                {data: {root: {context: []}}}
            ).then(function (rendered) {
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
    });
});
