/*globals describe, beforeEach, it*/
var testUtils = require('../utils'),
    should = require('should'),
    sinon = require('sinon'),
    when = require('when'),
    _ = require('underscore'),
    path = require('path'),

    // Stuff we are testing
    handlebars = require('express-hbs').handlebars,
    helpers = require('../../server/helpers'),
    Ghost = require('../../ghost');

describe('Core Helpers', function () {

    var ghost;

    beforeEach(function (done) {
        ghost = new Ghost();
        helpers.loadCoreHelpers(ghost).then(function () {
            done();
        }, done);
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
                        {"hash": {"words": 2}}
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
                        {"hash": {"characters": 8}}
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
            }, done);
        });

        it('can render class string for context', function (done) {
            when.all([
                helpers.body_class.call({ghostRoot: '/'}),
                helpers.body_class.call({ghostRoot: '/a-post-title'}),
                helpers.body_class.call({ghostRoot: '/page/4'})
            ]).then(function (rendered) {
                rendered.length.should.equal(3);

                should.exist(rendered[0]);
                should.exist(rendered[1]);
                should.exist(rendered[2]);

                rendered[0].string.should.equal('home-template');
                rendered[1].string.should.equal('post-template');
                rendered[2].string.should.equal('archive-template');

                done();
            });
        });

        it('can render class for static page', function (done) {
            helpers.body_class.call({
                ghostRoot: '/',
                post: {
                    page: true
                }
            }).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('home-template page');

                done();
            }, done);
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
            });
        });

        it('can render featured class', function (done) {
            var post = { featured: true };

            helpers.post_class.call(post).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('post featured');

                done();
            }, done);
        });
    });

    describe('ghost_head Helper', function () {
        it('has loaded ghost_head helper', function () {
            should.exist(handlebars.helpers.ghost_head);
        });

        it('returns meta tag string', function (done) {
            helpers.ghost_head.call({version: "0.3.0"}).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('<meta name="generator" content="Ghost 0.3" />\n<link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/">');

                done();
            });
        });

        it('returns meta tag string even if version is invalid', function () {
            var rendered = helpers.ghost_head.call({version: "0.9"}).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('<meta name="generator" content="Ghost 0.9" />\n<link rel="alternate" type="application/rss+xml" title="Ghost" href="/rss/">');
            });
        });
    });

    describe('ghost_foot Helper', function () {
        it('has loaded ghost_foot helper', function () {
            should.exist(handlebars.helpers.ghost_foot);
        });

        it('returns meta tag string', function (done) {
            helpers.ghost_foot.call().then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.match(/<script src=".*\/shared\/vendor\/jquery\/jquery.js"><\/script>/);

                done();
            });
        });
    });

    describe('url Helper', function () {
        it('has loaded url helper', function () {
            should.exist(handlebars.helpers.url);
        });

        it('should return a the slug with a prefix slash if the context is a post', function () {
            var rendered = helpers.url.call({html: 'content', markdown: "ff", title: "title", slug: "slug", created_at: new Date(0)});
            should.exist(rendered);
            rendered.should.equal('/slug/');
        });

        it('should output an absolute URL if the option is present', function () {
            var configStub = sinon.stub(ghost, "blogGlobals", function () {
                    return { url: 'http://testurl.com' };
                }),

                rendered = helpers.url.call(
                    {html: 'content', markdown: "ff", title: "title", slug: "slug", created_at: new Date(0)},
                    {hash: { absolute: 'true'}}
                );

            should.exist(rendered);
            rendered.should.equal('http://testurl.com/slug/');

            configStub.restore();
        });

        it('should return empty string if not a post', function () {
            helpers.url.call({markdown: "ff", title: "title", slug: "slug"}).should.equal('');
            helpers.url.call({html: 'content', title: "title", slug: "slug"}).should.equal('');
            helpers.url.call({html: 'content', markdown: "ff", slug: "slug"}).should.equal('');
            helpers.url.call({html: 'content', markdown: "ff", title: "title"}).should.equal('');
        });
    });

    describe('Page Url Helper', function () {
        it('has loaded pageUrl helper', function () {
            should.exist(handlebars.helpers.pageUrl);
        });

        it('can return a valid url', function () {
            helpers.pageUrl(1).should.equal('/');
            helpers.pageUrl(2).should.equal('/page/2/');
            helpers.pageUrl(50).should.equal('/page/50/');
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

        it('can render single page with no pagination necessary', function (done) {
            var rendered;
            helpers.loadCoreHelpers(ghost).then(function () {
                rendered = helpers.pagination.call({pagination: {page: 1, prev: undefined, next: undefined, limit: 15, total: 8, pages: 1}});
                should.exist(rendered);
                // strip out carriage returns and compare.
                rendered.string.should.match(paginationRegex);
                rendered.string.should.match(pageRegex);
                rendered.string.should.match(/Page 1 of 1/);
                rendered.string.should.not.match(newerRegex);
                rendered.string.should.not.match(olderRegex);
                done();
            }).then(null, done);
        });

        it('can render first page of many with older posts link', function (done) {
            var rendered;
            helpers.loadCoreHelpers(ghost).then(function () {
                rendered = helpers.pagination.call({pagination: {page: 1, prev: undefined, next: 2, limit: 15, total: 8, pages: 3}});
                should.exist(rendered);

                rendered.string.should.match(paginationRegex);
                rendered.string.should.match(pageRegex);
                rendered.string.should.match(olderRegex);
                rendered.string.should.match(/Page 1 of 3/);
                rendered.string.should.not.match(newerRegex);
                done();
            }).then(null, done);
        });

        it('can render middle pages of many with older and newer posts link', function (done) {
            var rendered;
            helpers.loadCoreHelpers(ghost).then(function () {
                rendered = helpers.pagination.call({pagination: {page: 2, prev: 1, next: 3, limit: 15, total: 8, pages: 3}});
                should.exist(rendered);

                rendered.string.should.match(paginationRegex);
                rendered.string.should.match(pageRegex);
                rendered.string.should.match(olderRegex);
                rendered.string.should.match(newerRegex);
                rendered.string.should.match(/Page 2 of 3/);

                done();
            }).then(null, done);
        });

        it('can render last page of many with newer posts link', function (done) {
            var rendered;
            helpers.loadCoreHelpers(ghost).then(function () {
                rendered = helpers.pagination.call({pagination: {page: 3, prev: 2, next: undefined, limit: 15, total: 8, pages: 3}});
                should.exist(rendered);

                rendered.string.should.match(paginationRegex);
                rendered.string.should.match(pageRegex);
                rendered.string.should.match(newerRegex);
                rendered.string.should.match(/Page 3 of 3/);
                rendered.string.should.not.match(olderRegex);

                done();
            }).then(null, done);
        });

        it('validates values', function (done) {
            helpers.loadCoreHelpers(ghost).then(function () {
                var runErrorTest = function (data) {
                    return function () {
                        helpers.pagination.call(data);
                    };
                };

                runErrorTest({pagination: {page: 3, prev: true, next: undefined, limit: 15, total: 8, pages: 3}})
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

                runErrorTest({pagination: {page: null, limit: 15, total: 8, pages: 3}})
                    .should.throwError('Invalid value, check page, pages, limit and total are numbers');
                runErrorTest({pagination: {page: 1, limit: null, total: 8, pages: 3}})
                    .should.throwError('Invalid value, check page, pages, limit and total are numbers');
                runErrorTest({pagination: {page: 1, limit: 15, total: null, pages: 3}})
                    .should.throwError('Invalid value, check page, pages, limit and total are numbers');
                runErrorTest({pagination: {page: 1, limit: 15, total: 8, pages: null}})
                    .should.throwError('Invalid value, check page, pages, limit and total are numbers');

                done();
            }).then(null, done);
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
                    {"hash": {}}
                );
            should.exist(rendered);

            String(rendered).should.equal('foo, bar');
        });

        it('can use a different separator', function () {
            var tags = [{name: 'haunted'}, {name: 'ghost'}],
                rendered = handlebars.helpers.tags.call(
                    {tags: tags},
                    {"hash": {separator: '|'}}
                );

            should.exist(rendered);

            String(rendered).should.equal('haunted|ghost');
        });

        it('can add a single prefix to multiple tags', function () {
            var tags = [{name: 'haunted'}, {name: 'ghost'}],
                rendered = handlebars.helpers.tags.call(
                    {tags: tags},
                    {"hash": {prefix: 'on '}}
                );

            should.exist(rendered);

            String(rendered).should.equal('on haunted, ghost');
        });

        it('can add a single suffix to multiple tags', function () {
            var tags = [{name: 'haunted'}, {name: 'ghost'}],
                rendered = handlebars.helpers.tags.call(
                    {tags: tags},
                    {"hash": {suffix: ' forever'}}
                );

            should.exist(rendered);

            String(rendered).should.equal('haunted, ghost forever');
        });

        it('can add a prefix and suffix to multiple tags', function () {
            var tags = [{name: 'haunted'}, {name: 'ghost'}],
                rendered = handlebars.helpers.tags.call(
                    {tags: tags},
                    {"hash": {suffix: ' forever', prefix: 'on '}}
                );

            should.exist(rendered);

            String(rendered).should.equal('on haunted, ghost forever');
        });

        it('does not add prefix or suffix if no tags exist', function () {
            var rendered = handlebars.helpers.tags.call(
                    {},
                    {"hash": {prefix: 'on ', suffix: ' forever'}}
                );

            should.exist(rendered);

            String(rendered).should.equal('');
        });
    });

    describe("meta_title helper", function () {

        it('has loaded meta_title helper', function () {
            should.exist(handlebars.helpers.meta_title);
        });

        it('can return blog title', function (done) {
            helpers.meta_title.call({ghostRoot: '/'}).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('Ghost');

                done();
            }, done);
        });

        it('can return title of a post', function (done) {
            var post = {ghostRoot: '/nice-post', post: {title: 'Post Title'}};
            helpers.meta_title.call(post).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('Post Title');

                done();
            }, done);
        });
    });

    describe("meta_description helper", function (done) {

        it('has loaded meta_description helper', function () {
            should.exist(handlebars.helpers.meta_description);
        });

        it('can return blog description', function () {
            helpers.meta_description.call({ghostRoot: '/'}).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('Just a blogging platform.');

                done();
            }, done);
        });

        it('can return empty description on post', function (done) {
            var post = {ghostRoot: '/nice-post', post: {title: 'Post Title'}};
            helpers.meta_description.call(post).then(function (rendered) {
                should.exist(rendered);
                rendered.string.should.equal('');

                done();
            }, done);
        });

    });

    describe("has_tag helper", function (done) {
        var tags = [{name: 'haunted'}, {name: 'ghost'}];

        it('has loaded has_tag helper', function () {
            should.exist(handlebars.helpers.has_tag);
        });

        it('can call function if tag is found', function() {
            helpers.has_tag.call({tags: tags}, 'haunted', {
                fn: function(tags) {
                    should.exist(tags);
                }
            });
        });

        it('can call inverse function if tag is not found', function() {
            helpers.has_tag.call({tags: tags}, 'undefined', {
                inverse: function(tags) {
                    should.exist(tags);
                }
            });
       });

    });
});