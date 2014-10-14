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

    it('returns open graph data on post page', function (done) {
        var post = {
            meta_description: 'blog description',
            title: 'Welcome to Ghost',
            image: '/test-image.png',
            published_at:  moment('2008-05-31T19:18:15').toISOString(),
            updated_at: moment('2014-10-06T15:23:54').toISOString(),
            tags: [{name: 'tag1'}, {name: 'tag2'}, {name: 'tag3'}]
        };

        helpers.ghost_head.call({relativeUrl: '/post/', version: '0.3.0', post: post}).then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal('<link rel="canonical" href="http://testurl.com/post/" />\n' +
                '    <meta property="og:site_name" content="Ghost" />\n' +
                '    <meta property="og:type" content="article" />\n' +
                '    <meta property="og:title" content="Welcome to Ghost" />\n' +
                '    <meta property="og:description" content="blog description..." />\n' +
                '    <meta property="og:url" content="http://testurl.com/post/" />\n' +
                '    <meta property="article:published_time" content="' + post.published_at + '" />\n' +
                '    <meta property="article:modified_time" content="' + post.updated_at + '" />\n' +
                '    <meta property="og:image" content="http://testurl.com/test-image.png" />\n' +
                '    <meta property="article:tag" content="tag1" />\n' +
                '    <meta property="article:tag" content="tag2" />\n' +
                '    <meta property="article:tag" content="tag3" />\n' +
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
