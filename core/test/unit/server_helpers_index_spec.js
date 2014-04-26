/*globals describe, beforeEach, afterEach, it*/
var testUtils      = require('../utils'),
    should         = require('should'),
    sinon          = require('sinon'),
    when           = require('when'),
    _              = require('lodash'),
    path           = require('path'),
    rewire         = require('rewire'),
    api            = require('../../server/api'),
    hbs            = require('express-hbs'),
    packageInfo    = require('../../../package'),

    // Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = rewire('../../server/helpers'),
    config         = rewire('../../server/config'),
    configUpdate   = config.__get__('updateConfig');

describe('Core Helpers', function () {

    var sandbox,
        apiStub,
        configStub,
        overrideConfig = function (newConfig) {
            helpers.__set__('config', function() {
                return newConfig;
            });
        };

    beforeEach(function (done) {
        var adminHbs = hbs.create();
        helpers = rewire('../../server/helpers');
        sandbox = sinon.sandbox.create();
        apiStub = sandbox.stub(api.settings, 'read', function (arg) {
            return when({value: 'casper'});
        });

        config = helpers.__get__('config');
        configStub = sandbox.stub().returns({
            'paths': {
                'subdir': '',
                'availableThemes': {
                    'casper': {
                        'assets': null,
                        'default.hbs': '/content/themes/casper/default.hbs',
                        'index.hbs': '/content/themes/casper/index.hbs',
                        'page.hbs': '/content/themes/casper/page.hbs',
                        'page-about.hbs': '/content/themes/casper/page-about.hbs',
                        'post.hbs': '/content/themes/casper/post.hbs'
                    }
                }
            }
        });
        _.extend(configStub, config);
        configStub.theme = sandbox.stub().returns({
            title: 'Ghost',
            description: 'Just a blogging platform.',
            url: 'http://testurl.com'
        });
        helpers.__set__('config', configStub);

        helpers.loadCoreHelpers(adminHbs);
        // Load template helpers in handlebars
        hbs.express3({ partialsDir: [config().paths.helperTemplates] });
        hbs.cachePartials(function () {
            done();
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Content Helper', function () {
        it('has loaded content helper', function () {
            should.exist(handlebars.helpers.content);
        });

        it('can render content', function () {
            var html = "Hello World",
                rendered = helpers.content.call({html: html});

            should.exist(rendered);
            rendered.string.should.equal(html);
        });

        it('can truncate html by word', function () {
            var html = "<p>Hello <strong>World! It's me!</strong></p>",
                rendered = (
                    helpers.content
                        .call(
                            {html: html},
                            {"hash": {"words": 2}}
                        )
                );

            should.exist(rendered);
            rendered.string.should.equal("<p>Hello <strong>World</strong></p>");
        });

        it('can truncate html to 0 words', function () {
            var html = "<p>Hello <strong>World! It's me!</strong></p>",
                rendered = (
                    helpers.content
                        .call(
                            {html: html},
                            {"hash": {"words": "0"}}
                        )
                );

            should.exist(rendered);
            rendered.string.should.equal("<p></p>");
        });

        it('can truncate html to 0 words, leaving image tag if it is first', function () {
            var html = "<p><img src='example.jpg' />Hello <strong>World! It's me!</strong></p>",
                rendered = (
                    helpers.content
                        .call(
                            {html: html},
                            {"hash": {"words": "0"}}
                        )
                );

            should.exist(rendered);
            rendered.string.should.equal("<p><img src='example.jpg' /></p>");
        });

        it('can truncate html to 0 words, leaving image tag if it is first and if it has an alt text with a single quote in the string', function () {
            var html = "<p><img src='example.jpg' alt=\"It's me!\" />Hello <strong>World! It's me!</strong></p>",
                rendered = (
                    helpers.content
                        .call(
                            { html: html },
                            { "hash": { "words": "0" } }
                        )
                );

            should.exist(rendered);
            rendered.string.should.equal("<p><img src='example.jpg' alt=\"It's me!\" /></p>");
        });

        it('can truncate html to 0 words, leaving image tag if it is first and if it has an alt text with a double quote in the string', function () {
            var html = "<p><img src='example.jpg' alt='A double quote is \"' />Hello <strong>World! It's me!</strong></p>",
                rendered = (
                    helpers.content
                        .call(
                            { html: html },
                            { "hash": { "words": "0" } }
                        )
                );

            should.exist(rendered);
            rendered.string.should.equal("<p><img src='example.jpg' alt='A double quote is \"' /></p>");
        });

        it('can truncate html by character', function () {
            var html = "<p>Hello <strong>World! It's me!</strong></p>",
                rendered = (
                    helpers.content
                        .call(
                            {html: html},
                            {"hash": {"characters": 8}}
                        )
                );

            should.exist(rendered);
            rendered.string.should.equal("<p>Hello <strong>Wo</strong></p>");
        });
    });

    describe('Author Helper', function () {

        it('has loaded author helper', function () {
            should.exist(handlebars.helpers.author);
        });

        it("Returns the full name of the author from the context", function () {
            var data = {"author": {"name": "abc123"}},
                result = helpers.author.call(data);

            String(result).should.equal("abc123");
        });

        it("Returns a blank string where author data is missing", function () {
            var data = {"author": null},
                result = helpers.author.call(data);

            String(result).should.equal("");
        });

    });

    describe('encode Helper', function () {

        it('has loaded encode helper', function () {
            should.exist(handlebars.helpers.encode);
        });

        it('can escape URI', function () {
            var uri = "$pecial!Charact3r(De[iver]y)Foo #Bar",
                expected = "%24pecial!Charact3r(De%5Biver%5Dy)Foo%20%23Bar",
                escaped = handlebars.helpers.encode(uri);

            should.exist(escaped);
            String(escaped).should.equal(expected);
        });
    });

    describe('Excerpt Helper', function () {

        it('has loaded excerpt helper', function () {
            should.exist(handlebars.helpers.excerpt);
        });

        it('can render excerpt', function () {
            var html = "Hello World",
                rendered = helpers.excerpt.call({html: html});

            should.exist(rendered);
            rendered.string.should.equal(html);
        });

        it('does not output HTML', function () {
            var html = '<p>There are <br />10<br> types<br/> of people in <img src="a">the world:'
                        + '<img src=b alt=\"c\"> those who <img src="@" onclick="javascript:alert(\'hello\');">'
                        + "understand trinary</p>, those who don't <div style='' class=~/'-,._?!|#>and"
                        + "< test > those<<< test >>> who mistake it &lt;for&gt; binary.",
                expected = "There are 10 types of people in the world: those who understand trinary, those who don't "
                         + "and those>> who mistake it &lt;for&gt; binary.",
                rendered = helpers.excerpt.call({html: html});

            should.exist(rendered);
            rendered.string.should.equal(expected);

        });

        it('can truncate html by word', function () {
            var html = "<p>Hello <strong>World! It's me!</strong></p>",
                expected = "Hello World",
                rendered = (
                    helpers.excerpt.call(
                        {html: html},
                        {"hash": {"words": "2"}}
                    )
                );

            should.exist(rendered);
            rendered.string.should.equal(expected);
        });

        it('can truncate html with non-ascii characters by word', function () {
            var html = "<p>Едквюэ опортэат <strong>праэчынт ючю но, квуй эю</strong></p>",
                expected = "Едквюэ опортэат",
                rendered = (
                    helpers.excerpt.call(
                        {html: html},
                        {"hash": {"words": "2"}}
                    )
                );

            should.exist(rendered);
            rendered.string.should.equal(expected);
        });

        it('can truncate html by character', function () {
            var html = "<p>Hello <strong>World! It's me!</strong></p>",
                expected = "Hello Wo",
                rendered = (
                    helpers.excerpt.call(
                        {html: html},
                        {"hash": {"characters": "8"}}
                    )
                );

            should.exist(rendered);
            rendered.string.should.equal(expected);
        });
    });

    describe('body_class Helper', function () {
        it('has loaded body_class helper', function () {
            should.exist(handlebars.helpers.body_class);
        });

        it('can render class string', function (done) {
            helpers.body_class.call({}).then(function (rendered) {
                should.exist(rendered);

                rendered.string.should.equal('home-template');

                done();
            }).then(null, done);
        });

        it('can render class string for context', function (done) {
            when.all([
                helpers.body_class.call({relativeUrl: '/'}),
                helpers.body_class.call({relativeUrl: '/a-post-title', post: {}}),
                helpers.body_class.call({relativeUrl: '/page/4'}),
                helpers.body_class.call({relativeUrl: '/tag/foo', tag: { slug: 'foo'}}),
                helpers.body_class.call({relativeUrl: '/tag/foo/page/2', tag: { slug: 'foo'}})
            ]).then(function (rendered) {
                rendered.length.should.equal(5);

                should.exist(rendered[0]);
                should.exist(rendered[1]);
                should.exist(rendered[2]);
                should.exist(rendered[3]);
                should.exist(rendered[4]);

                rendered[0].string.should.equal('home-template');
                rendered[1].string.should.equal('post-template');
                rendered[2].string.should.equal('archive-template');
                rendered[3].string.should.equal('tag-template tag-foo');
                rendered[4].string.should.equal('archive-template tag-template tag-foo');

                done();
            }).then(null, done);
        });

        it('can render class for static page', function (done) {
            helpers.body_class.call({
                relativeUrl: '/',
                post: {
                    page: true
                }
            }).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('home-template page');

                done();
            }).then(null, done);
        });

        it('can render class for static page with custom template', function (done) {
            helpers.body_class.call({
                relativeUrl: '/about',
                post: {
                    page: true,
                    slug: 'about'

                }
            }).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('post-template page page-template-about');

                done();
            }).then(null, done);
        });
    });

    describe('post_class Helper', function () {
        it('has loaded postclass helper', function () {
            should.exist(handlebars.helpers.post_class);
        });

        it('can render class string', function (done) {
            helpers.post_class.call({}).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('post');
                done();
            }).then(null, done);
        });

        it('can render featured class', function (done) {
            var post = { featured: true };

            helpers.post_class.call(post).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('post featured');

                done();
            }).then(null, done);
        });

        it('can render page class', function (done) {
            var post = { page: true };

            helpers.post_class.call(post).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('post page');

                done();
            }).then(null, done);
        });
    });

    describe('ghost_head Helper', function () {
         // TODO: these tests should be easier to do!
        var configUrl = config().url;

        afterEach(function () {
            configUpdate({url: configUrl});
        });

        it('has loaded ghost_head helper', function () {
            should.exist(handlebars.helpers.ghost_head);
        });

        it('returns meta tag string', function (done) {
            configUpdate({url: 'http://testurl.com/'});
            helpers.ghost_head.call({version: "0.3.0"}).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('<meta name="generator" content="Ghost 0.3" />\n' +
                    '<link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/">\n' +
                    '<link rel="canonical" href="http://testurl.com/" />');

                done();
            }).then(null, done);
        });

        it('returns meta tag string even if version is invalid', function (done) {
            configUpdate({url: 'http://testurl.com/'});
            helpers.ghost_head.call({version: "0.9"}).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('<meta name="generator" content="Ghost 0.9" />\n' +
                    '<link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/">\n' +
                    '<link rel="canonical" href="http://testurl.com/" />');

                done();
            }).then(null, done);
        });

        it('returns correct rss url with subdirectory', function (done) {
            configUpdate({url: 'http://testurl.com/blog/'});
            helpers.ghost_head.call({version: "0.3.0"}).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('<meta name="generator" content="Ghost 0.3" />\n' +
                    '<link rel="alternate" type="application/rss+xml" title="Ghost" href="/blog/rss/">\n' +
                    '<link rel="canonical" href="http://testurl.com/blog/" />');

                done();
            }).then(null, done);
        });

        it('returns canonical URL', function (done) {
            configUpdate({url: 'http://testurl.com'});
            helpers.ghost_head.call({version: "0.3.0", relativeUrl: '/about/'}).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('<meta name="generator" content="Ghost 0.3" />\n' +
                    '<link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/">\n' +
                    '<link rel="canonical" href="http://testurl.com/about/" />');

                done();
            }).then(null, done);
        });
    });

    describe('ghost_foot Helper', function () {
        it('has loaded ghost_foot helper', function () {
            should.exist(handlebars.helpers.ghost_foot);
        });

        it('outputs correct jquery for development mode', function (done) {
            helpers.assetHash = 'abc';

            helpers.ghost_foot.call().then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<script src=".*\/public\/jquery.js\?v=abc"><\/script>/);

                done();
            }).then(null, done);
        });

        it('outputs correct jquery for production mode', function (done) {
            helpers.assetHash = 'abc';
            helpers.__set__('isProduction', true);

            helpers.ghost_foot.call().then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<script src=".*\/public\/jquery.min.js\?v=abc"><\/script>/);

                done();
            }).then(null, done);
        });
    });

    describe('has Block Helper', function () {
        it('has loaded has block helper', function () {
            should.exist(handlebars.helpers.has);
        });

        it('should handle tag list that validates true', function () {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.has.call(
                {tags: [{ name: 'foo'}, { name: 'bar'}, { name: 'baz'}]},
                {hash: { tag: 'invalid, bar, wat'}, fn: fn, inverse: inverse}
            );

            fn.called.should.be.true;
            inverse.called.should.be.false;
        });

        it('should handle tags with case-insensitivity', function () {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.has.call(
                {tags: [{ name: 'ghost'}]},
                {hash: { tag: 'GhoSt'}, fn: fn, inverse: inverse}
            );

            fn.called.should.be.true;
            inverse.called.should.be.false;
        });

        it('should handle tag list that validates false', function () {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.has.call(
                {tags: [{ name: 'foo'}, { name: 'bar'}, { name: 'baz'}]},
                {hash: { tag: 'much, such, wow'}, fn: fn, inverse: inverse}
            );

            fn.called.should.be.false;
            inverse.called.should.be.true;
        });

        it('should not do anything when an invalid attribute is given', function () {
            var fn = sinon.spy(),
                inverse = sinon.spy();

            helpers.has.call(
                {tags: [{ name: 'foo'}, { name: 'bar'}, { name: 'baz'}]},
                {hash: { invalid: 'nonsense'}, fn: fn, inverse: inverse}
            );

            fn.called.should.be.false;
            inverse.called.should.be.false;
        });
    });

    describe('url Helper', function () {
        it('has loaded url helper', function () {
            should.exist(handlebars.helpers.url);
        });

        it('should return the slug with a prefix slash if the context is a post', function () {
            helpers.url.call({html: 'content', markdown: "ff", title: "title", slug: "slug", created_at: new Date(0)}).then(function (rendered) {
                should.exist(rendered);
                rendered.should.equal('/slug/');
            });
        });

        it('should output an absolute URL if the option is present', function () {
            helpers.url.call(
                {html: 'content', markdown: "ff", title: "title", slug: "slug", created_at: new Date(0)},
                {hash: { absolute: 'true'}}
            ).then(function (rendered) {
                should.exist(rendered);
                rendered.should.equal('http://testurl.com/slug/');
            });
        });

        it('should return the slug with a prefixed /tag/ if the context is a tag', function () {
            helpers.url.call({name: 'the tag', slug: "the-tag", description: null, parent_id: null}).then(function (rendered) {
                should.exist(rendered);
                rendered.should.equal('/tag/the-tag/');
            });
        });

        it('should return empty string if not a post or tag', function () {
            helpers.url.call({markdown: "ff", title: "title", slug: "slug"}).then(function (rendered) {
                rendered.should.equal('');
            });
            helpers.url.call({html: 'content', title: "title", slug: "slug"}).then(function (rendered) {
                rendered.should.equal('');
            });
            helpers.url.call({html: 'content', markdown: "ff", slug: "slug"}).then(function (rendered) {
                rendered.should.equal('');
            });
            helpers.url.call({html: 'content', markdown: "ff", title: "title"}).then(function (rendered) {
                rendered.should.equal('');
            });
        });
    });
    
    describe('Page Url Helper', function () {
        it('has loaded page_url helper', function () {
            should.exist(handlebars.helpers.page_url);
        });

        it('can return a valid url', function () {
            helpers.page_url(1).should.equal('/');
            helpers.page_url(2).should.equal('/page/2/');
            helpers.page_url(50).should.equal('/page/50/');
        });

        it('can return a valid url with subdirectory', function () {
            helpers.__set__('config', function() {
                return {
                    paths: {'subdir': '/blog'}
                };
            });
            helpers.page_url(1).should.equal('/blog/');
            helpers.page_url(2).should.equal('/blog/page/2/');
            helpers.page_url(50).should.equal('/blog/page/50/');
        });

        it('can return a valid url for tag pages', function () {
            var tagContext = {
                tagSlug: 'pumpkin'
            };
            helpers.page_url.call(tagContext, 1).should.equal('/tag/pumpkin/');
            helpers.page_url.call(tagContext, 2).should.equal('/tag/pumpkin/page/2/');
            helpers.page_url.call(tagContext, 50).should.equal('/tag/pumpkin/page/50/');
        });

        it('can return a valid url for tag pages with subdirectory', function () {
            helpers.__set__('config', function() {
                return {
                    paths: {'subdir': '/blog'}
                };
            });
            var tagContext = {
                tagSlug: 'pumpkin'
            };
            helpers.page_url.call(tagContext, 1).should.equal('/blog/tag/pumpkin/');
            helpers.page_url.call(tagContext, 2).should.equal('/blog/tag/pumpkin/page/2/');
            helpers.page_url.call(tagContext, 50).should.equal('/blog/tag/pumpkin/page/50/');
        });
    });

    describe('Page Url Helper: DEPRECATED', function () {
        it('has loaded pageUrl helper', function () {
            should.exist(handlebars.helpers.pageUrl);
        });

        it('can return a valid url', function () {
            helpers.pageUrl(1).should.equal('/');
            helpers.pageUrl(2).should.equal('/page/2/');
            helpers.pageUrl(50).should.equal('/page/50/');
        });

        it('can return a valid url with subdirectory', function () {
            helpers.__set__('config', function() {
                return {
                    paths: {'subdir': '/blog'}
                };
            });
            helpers.pageUrl(1).should.equal('/blog/');
            helpers.pageUrl(2).should.equal('/blog/page/2/');
            helpers.pageUrl(50).should.equal('/blog/page/50/');
        });

        it('can return a valid url for tag pages', function () {
            var tagContext = {
                tagSlug: 'pumpkin'
            };
            helpers.pageUrl.call(tagContext, 1).should.equal('/tag/pumpkin/');
            helpers.pageUrl.call(tagContext, 2).should.equal('/tag/pumpkin/page/2/');
            helpers.pageUrl.call(tagContext, 50).should.equal('/tag/pumpkin/page/50/');
        });

        it('can return a valid url for tag pages with subdirectory', function () {
            helpers.__set__('config', function() {
                return {
                    paths: {'subdir': '/blog'}
                };
            });
            var tagContext = {
                tagSlug: 'pumpkin'
            };
            helpers.pageUrl.call(tagContext, 1).should.equal('/blog/tag/pumpkin/');
            helpers.pageUrl.call(tagContext, 2).should.equal('/blog/tag/pumpkin/page/2/');
            helpers.pageUrl.call(tagContext, 50).should.equal('/blog/tag/pumpkin/page/50/');
        });
    });

    describe("Pagination helper", function () {
        var paginationRegex = /class="pagination"/,
            newerRegex = /class="newer-posts"/,
            olderRegex = /class="older-posts"/,
            pageRegex = /class="page-number"/;

        it('has loaded pagination helper', function () {
            should.exist(handlebars.helpers.pagination);
        });

        it('can render single page with no pagination necessary', function () {
            var rendered = helpers.pagination.call({pagination: {page: 1, prev: null, next: null, limit: 15, total: 8, pages: 1}});
            should.exist(rendered);
            // strip out carriage returns and compare.
            rendered.string.should.match(paginationRegex);
            rendered.string.should.match(pageRegex);
            rendered.string.should.match(/Page 1 of 1/);
            rendered.string.should.not.match(newerRegex);
            rendered.string.should.not.match(olderRegex);
        });

        it('can render first page of many with older posts link', function () {
            var rendered = helpers.pagination.call({pagination: {page: 1, prev: null, next: 2, limit: 15, total: 8, pages: 3}});
            should.exist(rendered);

            rendered.string.should.match(paginationRegex);
            rendered.string.should.match(pageRegex);
            rendered.string.should.match(olderRegex);
            rendered.string.should.match(/Page 1 of 3/);
            rendered.string.should.not.match(newerRegex);
        });

        it('can render middle pages of many with older and newer posts link', function () {
            var rendered = helpers.pagination.call({pagination: {page: 2, prev: 1, next: 3, limit: 15, total: 8, pages: 3}});
            should.exist(rendered);

            rendered.string.should.match(paginationRegex);
            rendered.string.should.match(pageRegex);
            rendered.string.should.match(olderRegex);
            rendered.string.should.match(newerRegex);
            rendered.string.should.match(/Page 2 of 3/);
        });

        it('can render last page of many with newer posts link', function () {
            var rendered = helpers.pagination.call({pagination: {page: 3, prev: 2, next: null, limit: 15, total: 8, pages: 3}});
            should.exist(rendered);

            rendered.string.should.match(paginationRegex);
            rendered.string.should.match(pageRegex);
            rendered.string.should.match(newerRegex);
            rendered.string.should.match(/Page 3 of 3/);
            rendered.string.should.not.match(olderRegex);
        });

        it('validates values', function () {

            var runErrorTest = function (data) {
                return function () {
                    helpers.pagination.call(data);
                };
            };

            runErrorTest({pagination: {page: 3, prev: true, next: null, limit: 15, total: 8, pages: 3}})
                .should.throwError('Invalid value, Next/Prev must be a number');
            runErrorTest({pagination: {page: 3, prev: 2, next: true, limit: 15, total: 8, pages: 3}})
                .should.throwError('Invalid value, Next/Prev must be a number');

            runErrorTest({pagination: {limit: 15, total: 8, pages: 3}})
                .should.throwError('All values must be defined for page, pages, limit and total');
            runErrorTest({pagination: {page: 3, total: 8, pages: 3}})
                .should.throwError('All values must be defined for page, pages, limit and total');
            runErrorTest({pagination: {page: 3, limit: 15, pages: 3}})
                .should.throwError('All values must be defined for page, pages, limit and total');
            runErrorTest({pagination: {page: 3, limit: 15, total: 8}})
                .should.throwError('All values must be defined for page, pages, limit and total');

            runErrorTest({pagination: {page: null, prev: null, next: null, limit: 15, total: 8, pages: 3}})
                .should.throwError('Invalid value, check page, pages, limit and total are numbers');
            runErrorTest({pagination: {page: 1, prev: null, next: null, limit: null, total: 8, pages: 3}})
                .should.throwError('Invalid value, check page, pages, limit and total are numbers');
            runErrorTest({pagination: {page: 1, prev: null, next: null, limit: 15, total: null, pages: 3}})
                .should.throwError('Invalid value, check page, pages, limit and total are numbers');
            runErrorTest({pagination: {page: 1, prev: null, next: null, limit: 15, total: 8, pages: null}})
                .should.throwError('Invalid value, check page, pages, limit and total are numbers');
        });
    });

    describe("tags helper", function () {

        it('has loaded tags helper', function () {
            should.exist(handlebars.helpers.tags);
        });

        it('can return string with tags', function () {
            var tags = [{name: 'foo'}, {name: 'bar'}],
                rendered = handlebars.helpers.tags.call(
                    {tags: tags},
                    {"hash": {autolink: 'false'}}
                );
            should.exist(rendered);

            String(rendered).should.equal('foo, bar');
        });

        it('can use a different separator', function () {
            var tags = [{name: 'haunted'}, {name: 'ghost'}],
                rendered = handlebars.helpers.tags.call(
                    {tags: tags},
                    {"hash": {separator: '|', autolink: 'false'}}
                );

            should.exist(rendered);

            String(rendered).should.equal('haunted|ghost');
        });

        it('can add a single prefix to multiple tags', function () {
            var tags = [{name: 'haunted'}, {name: 'ghost'}],
                rendered = handlebars.helpers.tags.call(
                    {tags: tags},
                    {"hash": {prefix: 'on ', autolink: 'false'}}
                );

            should.exist(rendered);

            String(rendered).should.equal('on haunted, ghost');
        });

        it('can add a single suffix to multiple tags', function () {
            var tags = [{name: 'haunted'}, {name: 'ghost'}],
                rendered = handlebars.helpers.tags.call(
                    {tags: tags},
                    {"hash": {suffix: ' forever', autolink: 'false'}}
                );

            should.exist(rendered);

            String(rendered).should.equal('haunted, ghost forever');
        });

        it('can add a prefix and suffix to multiple tags', function () {
            var tags = [{name: 'haunted'}, {name: 'ghost'}],
                rendered = handlebars.helpers.tags.call(
                    {tags: tags},
                    {"hash": {suffix: ' forever', prefix: 'on ', autolink: 'false'}}
                );

            should.exist(rendered);

            String(rendered).should.equal('on haunted, ghost forever');
        });

        it('can add a prefix and suffix with HTML', function () {
            var tags = [{name: 'haunted'}, {name: 'ghost'}],
                rendered = handlebars.helpers.tags.call(
                    {tags: tags},
                    {"hash": {suffix: ' &bull;', prefix: '&hellip; ', autolink: 'false'}}
                );

            should.exist(rendered);

            String(rendered).should.equal('&hellip; haunted, ghost &bull;');
        });

        it('does not add prefix or suffix if no tags exist', function () {
            var rendered = handlebars.helpers.tags.call(
                    {},
                    {"hash": {prefix: 'on ', suffix: ' forever', autolink: 'false'}}
                );

            should.exist(rendered);

            String(rendered).should.equal('');
        });

        it('can autolink tags to tag pages', function () {
            var tags = [{name: 'foo', slug: 'foo-bar'}, {name: 'bar', slug: 'bar'}],
                rendered = handlebars.helpers.tags.call(
                    {tags: tags},
                    {"hash": {}}
                );
            should.exist(rendered);

            String(rendered).should.equal('<a href="/tag/foo-bar/">foo</a>, <a href="/tag/bar/">bar</a>');
        });
    });

    describe("meta_title helper", function () {

        it('has loaded meta_title helper', function () {
            should.exist(handlebars.helpers.meta_title);
        });

        it('can return blog title', function (done) {
            helpers.meta_title.call({relativeUrl: '/'}).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('Ghost');

                done();
            }).then(null, done);
        });

        it('can return title of a post', function (done) {
            var post = {relativeUrl: '/nice-post', post: {title: 'Post Title'}};
            helpers.meta_title.call(post).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('Post Title');

                done();
            }).then(null, done);
        });

        it('can return tag name', function (done) {
            var post = {relativeUrl: '/tag/foo', tag: {name: 'foo'}};
            helpers.meta_title.call(post).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('foo - Ghost');

                done();
            }).then(null, done);
        });
    });

    describe("meta_description helper", function () {

        it('has loaded meta_description helper', function () {
            should.exist(handlebars.helpers.meta_description);
        });

        it('can return blog description', function (done) {
            helpers.meta_description.call({relativeUrl: '/'}).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('Just a blogging platform.');

                done();
            }).then(null, done);
        });

        it('can return empty description on post', function (done) {
            var post = {relativeUrl: '/nice-post', post: {title: 'Post Title'}};
            helpers.meta_description.call(post).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('');

                done();
            }).then(null, done);
        });

    });

    describe("asset helper", function () {
        var rendered,
            configOriginal;

        before(function() {
            configOriginal = helpers.__get__('config');
        });

        after(function() {
            helpers.__set__('config', configOriginal);
        });

        beforeEach(function () {
            helpers.assetHash = 'abc';
            helpers.__set__('config', configOriginal);
        });

        it('has loaded asset helper', function () {
            should.exist(handlebars.helpers.asset);
        });

        it("handles favicon correctly", function () {
            // with ghost set
            rendered = helpers.asset('favicon.ico', {"hash": {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');

            // without ghost set
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');

            overrideConfig({
                paths: {'subdir': '/blog'}
            });

            // with subdirectory
            rendered = helpers.asset('favicon.ico', {"hash": {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.ico');

            // without ghost set
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.ico');
        });

        it('handles shared assets correctly', function () {
            // with ghost set
            rendered = helpers.asset('shared/asset.js', {"hash": {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/shared/asset.js?v=abc');

            // without ghost set
            rendered = helpers.asset('shared/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/shared/asset.js?v=abc');

            overrideConfig({
                paths: {'subdir': '/blog'}
            });

            // with subdirectory
            rendered = helpers.asset('shared/asset.js', {"hash": {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/blog/shared/asset.js?v=abc');

            // without ghost set
            rendered = helpers.asset('shared/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/blog/shared/asset.js?v=abc');
        });

        it('handles admin assets correctly', function () {
            // with ghost set
            rendered = helpers.asset('js/asset.js', {"hash": {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/ghost/js/asset.js?v=abc');

            overrideConfig({
                paths: {'subdir': '/blog'}
            });

            // with subdirectory
            rendered = helpers.asset('js/asset.js', {"hash": {ghost: 'true'}});
            should.exist(rendered);
            String(rendered).should.equal('/blog/ghost/js/asset.js?v=abc');
        });

        it('handles theme assets correctly', function () {
            // with ghost set
            rendered = helpers.asset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/assets/js/asset.js?v=abc');

            overrideConfig({
                paths: {'subdir': '/blog'}
            });

            // with subdirectory
            rendered = helpers.asset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/blog/assets/js/asset.js?v=abc');
        });

    });

    // ## Admin only helpers
    describe("ghostScriptTags  helper", function () {
        var rendered,
            configOriginal;

        before(function() {
            configOriginal = helpers.__get__('config');
        });

        after(function() {
            helpers.__set__('config', configOriginal);
        });

        beforeEach(function () {
            // set the asset hash
            helpers = rewire('../../server/helpers');
            helpers.assetHash = 'abc';
            helpers.__set__('config', configOriginal);
        });

        it('has loaded ghostScriptTags  helper', function () {
            should.exist(helpers.ghost_script_tags);
        });

        it('outputs correct scripts for development mode', function () {
            rendered = helpers.ghost_script_tags();
            should.exist(rendered);
            String(rendered).should.equal(
                '<script src="/ghost/scripts/vendor.js?v=abc"></script>' +
                    '<script src="/ghost/scripts/helpers.js?v=abc"></script>' +
                    '<script src="/ghost/scripts/templates.js?v=abc"></script>' +
                    '<script src="/ghost/scripts/models.js?v=abc"></script>' +
                    '<script src="/ghost/scripts/views.js?v=abc"></script>'
            );

            overrideConfig({
                paths: {'subdir': '/blog'}
            });

            // with subdirectory
            rendered = helpers.ghost_script_tags();
            should.exist(rendered);
            String(rendered).should.equal(
                '<script src="/blog/ghost/scripts/vendor.js?v=abc"></script>' +
                    '<script src="/blog/ghost/scripts/helpers.js?v=abc"></script>' +
                    '<script src="/blog/ghost/scripts/templates.js?v=abc"></script>' +
                    '<script src="/blog/ghost/scripts/models.js?v=abc"></script>' +
                    '<script src="/blog/ghost/scripts/views.js?v=abc"></script>'
            );
        });

        it('outputs correct scripts for production mode', function () {

            helpers.__set__('isProduction', true);

            rendered = helpers.ghost_script_tags();
            should.exist(rendered);
            String(rendered).should.equal('<script src="/ghost/scripts/ghost.min.js?v=abc"></script>');

            overrideConfig({
                paths: {'subdir': '/blog'}
            });

            // with subdirectory
            rendered = helpers.ghost_script_tags();
            should.exist(rendered);
            String(rendered).should.equal('<script src="/blog/ghost/scripts/ghost.min.js?v=abc"></script>');
        });
    });

    describe('adminUrl', function () {
        var rendered,
            configUrl = config().url;

        afterEach(function () {
            configUpdate({url: configUrl});
        });


        it('should output the path to admin', function () {
            rendered = helpers.admin_url();
            should.exist(rendered);
            rendered.should.equal('/ghost');
        });

        it('should output the path to admin with subdirectory', function () {
            configUpdate({url: 'http://testurl.com/blog/'});
            rendered = helpers.admin_url();
            should.exist(rendered);
            rendered.should.equal('/blog/ghost');
        });

        it('should output absolute path if absolute is set', function () {
            // no trailing slash
            configUpdate({url: 'http://testurl.com'});

            rendered = helpers.admin_url({"hash": {absolute: true}});
            should.exist(rendered);
            rendered.should.equal('http://testurl.com/ghost');

            // test trailing slash
            configUpdate({url: 'http://testurl.com/'});
            rendered = helpers.admin_url({"hash": {absolute: true}});
            should.exist(rendered);
            rendered.should.equal('http://testurl.com/ghost');
        });

        it('should output absolute path with subdirectory', function () {
            configUpdate({url: 'http://testurl.com/blog'});
            rendered = helpers.admin_url({"hash": {absolute: true}});
            should.exist(rendered);
            rendered.should.equal('http://testurl.com/blog/ghost');
        });

        it('should output the path to frontend if frontend is set', function () {
            rendered = helpers.admin_url({"hash": {frontend: true}});
            should.exist(rendered);
            rendered.should.equal('/');
        });

        it('should output the absolute path to frontend if both are set', function () {
            configUpdate({url: 'http://testurl.com'});

            rendered = helpers.admin_url({"hash": {frontend: true, absolute: true}});
            should.exist(rendered);
            rendered.should.equal('http://testurl.com/');

            configUpdate({url: 'http://testurl.com/'});
            rendered = helpers.admin_url({"hash": {frontend: true, absolute: true}});
            should.exist(rendered);
            rendered.should.equal('http://testurl.com/');
        });

        it('should output the path to frontend with subdirectory', function () {
            configUpdate({url: 'http://testurl.com/blog/'});
            rendered = helpers.admin_url({"hash": {frontend: true}});
            should.exist(rendered);
            rendered.should.equal('/blog/');
        });

        it('should output the absolute path to frontend with subdirectory', function () {
            configUpdate({url: 'http://testurl.com/blog/'});
            rendered = helpers.admin_url({"hash": {frontend: true, absolute: true}});
            should.exist(rendered);
            rendered.should.equal('http://testurl.com/blog/');
        });
    });
    describe('updateNotification', function () {
        it('outputs a correctly formatted notification when db version is higher than package version', function (done) {
            var defaultOutput = '<div class="notification-success">' +
                'A new version of Ghost is available! Hot damn. ' +
                '<a href="http://ghost.org/download">Upgrade now</a></div>',
                classOutput = ' update-available';

            apiStub.restore();
            apiStub = sandbox.stub(api.settings, 'read', function () {
                var futureversion = packageInfo.version.split('.');
                futureversion[futureversion.length - 1] = parseInt(futureversion[futureversion.length - 1], 10) + 1;
                return when({value: futureversion.join('.')});
            });

            helpers.update_notification.call({currentUser: {name: 'bob'}}).then(function (rendered) {
                should.exist(rendered);

                rendered.should.equal(defaultOutput);

                // Test classOnly option
                return helpers.update_notification.call({currentUser: {name: 'bob'}}, {'hash': {'classOnly': 'true'}});
            }).then(function (rendered) {
                should.exist(rendered);

                rendered.should.equal(classOutput);

                done();
            }).then(null, done);
        });

        it('does NOT output a correctly formatted notification when db version equals package version', function (done) {
            apiStub.restore();
            apiStub = sandbox.stub(api.settings, 'read', function () {
                return when({value: packageInfo.version});
            });

            helpers.update_notification.call({currentUser: {name: 'bob'}}).then(function (rendered) {
                should.exist(rendered);
                rendered.should.equal('');
                done();
            }).then(null, done);
        });

        it('does NOT output a notification if updateCheck is false', function (done) {
            helpers.__set__('config', function () { return { updateCheck: false}; });

            apiStub.restore();
            apiStub = sandbox.stub(api.settings, 'read', function () {
                return when({value: 'true'});
            });

            helpers.update_notification.call({currentUser: {name: 'bob'}}).then(function (rendered) {
                should.exist(rendered);
                rendered.should.equal('');
                done();
            }).then(null, done);
        });

        it('does NOT output a notification if the user is not logged in', function (done) {
            apiStub.restore();
            apiStub = sandbox.stub(api.settings, 'read', function () {
                var futureversion = packageInfo.version.split('.');
                futureversion[futureversion.length-1] = parseInt(futureversion[futureversion.length-1], 10) + 1;
                return when({value: futureversion.join('.')});
            });

            helpers.update_notification.call().then(function (rendered) {
                should.exist(rendered);
                rendered.should.equal('');
                done();
            }).then(null, done);
        });
    });
});
