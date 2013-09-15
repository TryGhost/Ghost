/*globals describe, beforeEach, it*/
var testUtils = require('./testUtils'),
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
                rendered = handlebars.helpers.content.call({html: html});

            should.exist(rendered);
            rendered.string.should.equal(html);
        });

        it('can truncate html by word', function () {
            var html = "<p>Hello <strong>World! It's me!</strong></p>",
                rendered = (
                    handlebars.helpers.content
                        .call(
                            {html: html},
                            {"hash":{"words": 2}}
                        )
                );

            should.exist(rendered);
            rendered.string.should.equal("<p>Hello <strong>World</strong></p>");
        });

        it('can truncate html by character', function () {
            var html = "<p>Hello <strong>World! It's me!</strong></p>",
                rendered = (
                    handlebars.helpers.content
                        .call(
                            {html: html},
                            {"hash":{"characters": 8}}
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

        it("Returns the full name of the author from the context",function() {
            var data = {"author":{"name":"abc123"}},
                result = handlebars.helpers.author.call(data);

            String(result).should.equal("abc123");
        });

        it("Returns a blank string where author data is missing",function() {
            var data = {"author": null},
                result = handlebars.helpers.author.call(data);

            String(result).should.equal("");
        });

    });

    describe('Excerpt Helper', function () {

        it('has loaded excerpt helper', function () {
            should.exist(handlebars.helpers.excerpt);
        });

        it('can render excerpt', function () {
            var html = "Hello World",
                rendered = handlebars.helpers.excerpt.call({html: html});

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
                rendered = handlebars.helpers.excerpt.call({html: html});

            should.exist(rendered);
            rendered.string.should.equal(expected);

        });

        it('can truncate html by word', function () {
            var html = "<p>Hello <strong>World! It's me!</strong></p>",
                expected = "Hello World",
                rendered = (
                    handlebars.helpers.excerpt.call(
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
                    handlebars.helpers.excerpt.call(
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

        it('can render class string', function () {
            var rendered = handlebars.helpers.body_class.call({});
            should.exist(rendered);

            rendered.string.should.equal('home-template');
        });

        it('can render class string for context', function () {
            var rendered1 = handlebars.helpers.body_class.call({path: '/'}),
                rendered2 = handlebars.helpers.body_class.call({path: '/a-post-title'}),
                rendered3 = handlebars.helpers.body_class.call({path: '/page/4'});

            should.exist(rendered1);
            should.exist(rendered2);
            should.exist(rendered3);

            rendered1.string.should.equal('home-template');
            rendered2.string.should.equal('post-template');
            rendered3.string.should.equal('archive-template');
        });
    });

    describe('post_class Helper', function () {
        it('has loaded postclass helper', function () {
            should.exist(handlebars.helpers.post_class);
        });

        it('can render class string', function () {
            var rendered = handlebars.helpers.post_class.call({});
            should.exist(rendered);

            rendered.string.should.equal('post');
        });
    });

    describe('ghost_head Helper', function () {
        it('has loaded ghost_head helper', function () {
            should.exist(handlebars.helpers.ghost_head);
        });

        it('returns meta tag string', function () {
            var rendered = handlebars.helpers.ghost_head.call({version: "0.3"});
            should.exist(rendered);
            rendered.string.should.equal('<meta name="generator" content="Ghost 0.3" />\n<link rel="alternate" type="application/rss+xml" title="RSS" href="/rss/">');
        });
    });

    describe('ghost_foot Helper', function () {
        it('has loaded ghost_foot helper', function () {
            should.exist(handlebars.helpers.ghost_foot);
        });

        it('returns meta tag string', function () {
            var rendered = handlebars.helpers.ghost_foot.call();
            should.exist(rendered);
            rendered.string.should.equal('<script src="/shared/vendor/jquery/jquery.js"></script>');
        });
    });

    describe('url Helper', function () {
        it('has loaded url helper', function () {
            should.exist(handlebars.helpers.url);
        });

        it('should return a the slug with a prefix slash if the context is a post', function () {
            var rendered = handlebars.helpers.url.call({html: 'content', markdown: "ff", title: "title", slug: "slug"});
            should.exist(rendered);
            rendered.should.equal('/slug/');
        });

        it('should output an absolute URL if the option is present', function () {
            var configStub = sinon.stub(ghost, "config", function () {
                    return { url: 'http://testurl.com' };
                }),

                rendered = handlebars.helpers.url.call(
                    {html: 'content', markdown: "ff", title: "title", slug: "slug"},
                    {hash: { absolute: 'true'}}
                );

            should.exist(rendered);
            rendered.should.equal('http://testurl.com/slug/');

            configStub.restore();
        });

        it('should return empty string if not a post', function () {
            handlebars.helpers.url.call({markdown: "ff", title: "title", slug: "slug"}).should.equal('');
            handlebars.helpers.url.call({html: 'content', title: "title", slug: "slug"}).should.equal('');
            handlebars.helpers.url.call({html: 'content', markdown: "ff", slug: "slug"}).should.equal('');
            handlebars.helpers.url.call({html: 'content', markdown: "ff", title: "title"}).should.equal('');
        });
    });

    describe('Page Url Helper', function () {
        it('has loaded pageUrl helper', function () {
            should.exist(handlebars.helpers.pageUrl);
        });

        it('can return a valid url', function () {
            handlebars.helpers.pageUrl(1).should.equal('/');
            handlebars.helpers.pageUrl(2).should.equal('/page/2/');
            handlebars.helpers.pageUrl(50).should.equal('/page/50/');
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
                rendered = handlebars.helpers.pagination.call({pagination: {page: 1, prev: undefined, next: undefined, limit: 15, total: 8, pages: 1}});
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
                rendered = handlebars.helpers.pagination.call({pagination: {page: 1, prev: undefined, next: 2, limit: 15, total: 8, pages: 3}});
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
                rendered = handlebars.helpers.pagination.call({pagination: {page: 2, prev: 1, next: 3, limit: 15, total: 8, pages: 3}});
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
                rendered = handlebars.helpers.pagination.call({pagination: {page: 3, prev: 2, next: undefined, limit: 15, total: 8, pages: 3}});
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
                        handlebars.helpers.pagination.call(data);
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
});