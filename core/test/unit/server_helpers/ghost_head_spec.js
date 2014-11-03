/*globals describe, before, after, it*/
/*jshint expr:true*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),
    moment         = require('moment'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{ghost_head}} helper', function () {
    before(function () {
        utils.loadHelpers();
        utils.overrideConfig({
            url: 'http://testurl.com/',
            theme: {
                title: 'Ghost'
            }
        });
    });

    after(function () {
        utils.restoreConfig();
    });

    it('has loaded ghost_head helper', function () {
        should.exist(handlebars.helpers.ghost_head);
    });

    it('returns meta tag string', function (done) {
        helpers.ghost_head.call({version: '0.3.0', post: false}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('<link rel="canonical" href="http://testurl.com/" />\n' +
                '    <meta name="generator" content="Ghost 0.3" />\n' +
                '    <link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/" />');

            done();
        }).catch(done);
    });

    it('returns meta tag string even if version is invalid', function (done) {
        helpers.ghost_head.call({version: '0.9'}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('<link rel="canonical" href="http://testurl.com/" />\n' +
                '    <meta name="generator" content="Ghost 0.9" />\n' +
                '    <link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/" />');

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
                url: 'http//:testauthorurl.com',
                slug: 'Author',
                image: '/content/images/test-author-image.png',
                website: 'http://authorwebsite.com'
            }
        };

        helpers.ghost_head.call({relativeUrl: '/post/', version: '0.3.0', post: post}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('<link rel="canonical" href="http://testurl.com/post/" />\n    \n' +
                '    <meta property="og:site_name" content="Ghost" />\n' +
                '    <meta property="og:type" content="article" />\n' +
                '    <meta property="og:title" content="Welcome to Ghost" />\n' +
                '    <meta property="og:description" content="blog description..." />\n' +
                '    <meta property="og:url" content="http://testurl.com/post/" />\n' +
                '    <meta property="og:image" content="http://testurl.com/content/images/test-image.png" />\n' +
                '    <meta property="article:published_time" content="' + post.published_at + '" />\n' +
                '    <meta property="article:modified_time" content="' + post.updated_at + '" />\n' +
                '    <meta property="article:tag" content="tag1" />\n' +
                '    <meta property="article:tag" content="tag2" />\n' +
                '    <meta property="article:tag" content="tag3" />\n    \n' +
                '    <meta name="twitter:card" content="summary_large_image" />\n' +
                '    <meta name="twitter:title" content="Welcome to Ghost" />\n' +
                '    <meta name="twitter:description" content="blog description..." />\n' +
                '    <meta name="twitter:url" content="http://testurl.com/post/" />\n' +
                '    <meta name="twitter:image:src" content="http://testurl.com/content/images/test-image.png" />\n    \n' +
                '    <script type=\"application/ld+json\">\n{\n' +
                '    "@context": "http://schema.org",\n    "@type": "Article",\n    "publisher": "Ghost",\n' +
                '    "author": {\n        "@type": "Person",\n        "name": "Author name",\n    ' +
                '    \"image\": \"http://testurl.com/content/images/test-author-image.png\",\n    ' +
                '    "url": "http://testurl.com/author/Author",\n        "sameAs": "http://authorwebsite.com"\n    ' +
                '},\n    "headline": "Welcome to Ghost",\n    "url": "http://testurl.com/post/",\n' +
                '    "datePublished": "' + post.published_at + '",\n    "dateModified": "' + post.updated_at + '",\n' +
                '    "image": "http://testurl.com/content/images/test-image.png",\n    "keywords": "tag1, tag2, tag3",\n' +
                '    "description": "blog description..."\n}\n    </script>\n\n' +
                '    <meta name="generator" content="Ghost 0.3" />\n' +
                '    <link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/" />');

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
                website: 'http://authorwebsite.com'
            }
        };

        helpers.ghost_head.call({relativeUrl: '/post/', version: '0.3.0', post: post}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('<link rel="canonical" href="http://testurl.com/post/" />\n    \n' +
                '    <meta property="og:site_name" content="Ghost" />\n' +
                '    <meta property="og:type" content="article" />\n' +
                '    <meta property="og:title" content="Welcome to Ghost &quot;test&quot;" />\n' +
                '    <meta property="og:description" content="blog &quot;test&quot; description..." />\n' +
                '    <meta property="og:url" content="http://testurl.com/post/" />\n' +
                '    <meta property="og:image" content="http://testurl.com/content/images/test-image.png" />\n' +
                '    <meta property="article:published_time" content="' + post.published_at + '" />\n' +
                '    <meta property="article:modified_time" content="' + post.updated_at + '" />\n' +
                '    <meta property="article:tag" content="tag1" />\n' +
                '    <meta property="article:tag" content="tag2" />\n' +
                '    <meta property="article:tag" content="tag3" />\n    \n' +
                '    <meta name="twitter:card" content="summary_large_image" />\n' +
                '    <meta name="twitter:title" content="Welcome to Ghost &quot;test&quot;" />\n' +
                '    <meta name="twitter:description" content="blog &quot;test&quot; description..." />\n' +
                '    <meta name="twitter:url" content="http://testurl.com/post/" />\n' +
                '    <meta name="twitter:image:src" content="http://testurl.com/content/images/test-image.png" />\n    \n' +
                '    <script type=\"application/ld+json\">\n{\n' +
                '    "@context": "http://schema.org",\n    "@type": "Article",\n    "publisher": "Ghost",\n' +
                '    "author": {\n        "@type": "Person",\n        "name": "Author name",\n    ' +
                '    \"image\": \"http://testurl.com/content/images/test-author-image.png\",\n    ' +
                '    "url": "http://testurl.com/author/Author",\n        "sameAs": "http://authorwebsite.com"\n    ' +
                '},\n    "headline": "Welcome to Ghost &quot;test&quot;",\n    "url": "http://testurl.com/post/",\n' +
                '    "datePublished": "' + post.published_at + '",\n    "dateModified": "' + post.updated_at + '",\n' +
                '    "image": "http://testurl.com/content/images/test-image.png",\n    "keywords": "tag1, tag2, tag3",\n' +
                '    "description": "blog &quot;test&quot; description..."\n}\n    </script>\n\n' +
                '    <meta name="generator" content="Ghost 0.3" />\n' +
                '    <link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/" />');

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
                website: 'http://authorwebsite.com'
            }
        };

        helpers.ghost_head.call({relativeUrl: '/post/', version: '0.3.0', post: post}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('<link rel="canonical" href="http://testurl.com/post/" />\n    \n' +
                '    <meta property="og:site_name" content="Ghost" />\n' +
                '    <meta property="og:type" content="article" />\n' +
                '    <meta property="og:title" content="Welcome to Ghost" />\n' +
                '    <meta property="og:description" content="blog description..." />\n' +
                '    <meta property="og:url" content="http://testurl.com/post/" />\n' +
                '    <meta property="og:image" content="http://testurl.com/content/images/test-image.png" />\n' +
                '    <meta property="article:published_time" content="' + post.published_at + '" />\n' +
                '    <meta property="article:modified_time" content="' + post.updated_at + '" />\n    \n' +
                '    <meta name="twitter:card" content="summary_large_image" />\n' +
                '    <meta name="twitter:title" content="Welcome to Ghost" />\n' +
                '    <meta name="twitter:description" content="blog description..." />\n' +
                '    <meta name="twitter:url" content="http://testurl.com/post/" />\n' +
                '    <meta name="twitter:image:src" content="http://testurl.com/content/images/test-image.png" />\n    \n' +
                '    <script type=\"application/ld+json\">\n{\n' +
                '    "@context": "http://schema.org",\n    "@type": "Article",\n    "publisher": "Ghost",\n' +
                '    "author": {\n        "@type": "Person",\n        "name": "Author name",\n    ' +
                '    \"image\": \"http://testurl.com/content/images/test-author-image.png\",\n    ' +
                '    "url": "http://testurl.com/author/Author",\n        "sameAs": "http://authorwebsite.com"\n    ' +
                '},\n    "headline": "Welcome to Ghost",\n    "url": "http://testurl.com/post/",\n' +
                '    "datePublished": "' + post.published_at + '",\n    "dateModified": "' + post.updated_at + '",\n' +
                '    "image": "http://testurl.com/content/images/test-image.png",\n' +
                '    "description": "blog description..."\n}\n    </script>\n\n' +
                '    <meta name="generator" content="Ghost 0.3" />\n' +
                '    <link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/" />');

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
                website: 'http://authorwebsite.com'
            }
        };

        helpers.ghost_head.call({relativeUrl: '/post/', version: '0.3.0', post: post}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('<link rel="canonical" href="http://testurl.com/post/" />\n    \n' +
                '    <meta property="og:site_name" content="Ghost" />\n' +
                '    <meta property="og:type" content="article" />\n' +
                '    <meta property="og:title" content="Welcome to Ghost" />\n' +
                '    <meta property="og:description" content="blog description..." />\n' +
                '    <meta property="og:url" content="http://testurl.com/post/" />\n' +
                '    <meta property="article:published_time" content="' + post.published_at + '" />\n' +
                '    <meta property="article:modified_time" content="' + post.updated_at + '" />\n' +
                '    <meta property="article:tag" content="tag1" />\n' +
                '    <meta property="article:tag" content="tag2" />\n' +
                '    <meta property="article:tag" content="tag3" />\n    \n' +
                '    <meta name="twitter:card" content="summary" />\n' +
                '    <meta name="twitter:title" content="Welcome to Ghost" />\n' +
                '    <meta name="twitter:description" content="blog description..." />\n' +
                '    <meta name="twitter:url" content="http://testurl.com/post/" />\n    \n' +
                '    <script type=\"application/ld+json\">\n{\n' +
                '    "@context": "http://schema.org",\n    "@type": "Article",\n    "publisher": "Ghost",\n' +
                '    "author": {\n        "@type": "Person",\n        "name": "Author name",\n    ' +
                '    "url": "http://testurl.com/author/Author",\n        "sameAs": "http://authorwebsite.com"\n    ' +
                '},\n    "headline": "Welcome to Ghost",\n    "url": "http://testurl.com/post/",\n' +
                '    "datePublished": "' + post.published_at + '",\n    "dateModified": "' + post.updated_at + '",\n' +
                '    "keywords": "tag1, tag2, tag3",\n    "description": "blog description..."\n}\n    </script>\n\n' +
                '    <meta name="generator" content="Ghost 0.3" />\n' +
                '    <link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/" />');

            done();
        }).catch(done);
    });

    it('does not return structured data if useStructuredData is set to false in config file', function (done) {
        utils.overrideConfig({
            privacy: {
                useStructuredData: false
            }
        });

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
                website: 'http://authorwebsite.com'
            }
        };

        helpers.ghost_head.call({relativeUrl: '/post/', version: '0.3.0', post: post}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('<link rel="canonical" href="http://testurl.com/post/" />\n' +
                '    <meta name="generator" content="Ghost 0.3" />\n' +
                '    <link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/" />');

            done();
        }).catch(done);
    });

    it('returns canonical URL', function (done) {
        helpers.ghost_head.call({version: '0.3.0', relativeUrl: '/about/'}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('<link rel="canonical" href="http://testurl.com/about/" />\n' +
                '    <meta name="generator" content="Ghost 0.3" />\n' +
                '    <link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/" />');

            done();
        }).catch(done);
    });

    it('returns next & prev URL correctly for middle page', function (done) {
        helpers.ghost_head.call({version: '0.3.0', relativeUrl: '/page/3/', pagination: {next: '4', prev: '2'}}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('<link rel="canonical" href="http://testurl.com/page/3/" />\n' +
                '    <link rel="prev" href="http://testurl.com/page/2/" />\n' +
                '    <link rel="next" href="http://testurl.com/page/4/" />\n' +
                '    <meta name="generator" content="Ghost 0.3" />\n' +
                '    <link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/" />');
            done();
        }).catch(done);
    });

    it('returns next & prev URL correctly for second page', function (done) {
        helpers.ghost_head.call({version: '0.3.0', relativeUrl: '/page/2/', pagination: {next: '3', prev: '1'}}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('<link rel="canonical" href="http://testurl.com/page/2/" />\n' +
                '    <link rel="prev" href="http://testurl.com/" />\n' +
                '    <link rel="next" href="http://testurl.com/page/3/" />\n' +
                '    <meta name="generator" content="Ghost 0.3" />\n' +
                '    <link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/" />');
            done();
        }).catch(done);
    });

    describe('with /blog subdirectory', function () {
        before(function () {
            utils.overrideConfig({
                url: 'http://testurl.com/blog/',
                theme: {
                    title: 'Ghost'
                }
            });
        });

        after(function () {
            utils.restoreConfig();
        });

        it('returns correct rss url with subdirectory', function (done) {
            helpers.ghost_head.call({version: '0.3.0'}).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('<link rel="canonical" href="http://testurl.com/blog/" />\n' +
                    '    <meta name="generator" content="Ghost 0.3" />\n' +
                    '    <link rel="alternate" type="application/rss+xml" title="Ghost" href="/blog/rss/" />');

                done();
            }).catch(done);
        });
    });
});
