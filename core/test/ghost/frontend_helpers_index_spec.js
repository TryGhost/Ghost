/*globals describe, beforeEach, it*/
var should = require('should'),
    sinon = require('sinon'),
    when = require('when'),
    _ = require('underscore'),
    handlebars = require('express-hbs').handlebars,
    path = require('path'),
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
            var content = "Hello World",
                rendered = handlebars.helpers.content.call({content: content});

            should.exist(rendered);
            rendered.string.should.equal(content);
        });
    });

    describe('Navigation Helper', function () {

        it('has loaded nav helper', function () {
            should.exist(handlebars.helpers.nav);
        });

        it('can render nav items', function (done) {
            var templateSpy = sinon.spy(function (data) { return "rendered " + data.links.length; }),
                compileSpy = sinon.stub(ghost, 'compileTemplate').returns(when.resolve(templateSpy)),
                fakeNavItems = [{
                    title: 'test1',
                    url: '/test1'
                }, {
                    title: 'test2',
                    url: '/test2'
                }],
                rendered;

            helpers.loadCoreHelpers(ghost).then(function () {
                rendered = handlebars.helpers.nav.call({navItems: fakeNavItems});

                // Returns a string returned from navTemplateFunc
                should.exist(rendered);
                rendered.string.should.equal("rendered 2");

                compileSpy.called.should.equal(true);
                templateSpy.called.should.equal(true);
                templateSpy.calledWith({ links: fakeNavItems }).should.equal(true);


                compileSpy.restore();

                done();
            }).then(null, done);
        });
    });

    describe("Pagination helper", function () {
        it('has loaded paginate helper', function () {
            should.exist(handlebars.helpers.paginate);
        });

        it('can render single page with no pagination necessary', function (done) {
            var rendered;
            helpers.loadCoreHelpers(ghost).then(function () {
                rendered = handlebars.helpers.paginate.call({pagination: {page: 1, prev: null, next: null, limit: 15, total: 8, pages: 1}});
                should.exist(rendered);
                rendered.string.should.equal('\n<nav id="pagination" role="pagination">\n    \n    <div class="page-number">Page 1<span class="extended"> of 1</span></div>\n    \n</nav>');
                done();
            }).then(null, done);
        });

        it('can render first page of many with older posts link', function (done) {
            var rendered;
            helpers.loadCoreHelpers(ghost).then(function () {
                rendered = handlebars.helpers.paginate.call({pagination: {page: 1, prev: null, next: 2, limit: 15, total: 8, pages: 3}});
                should.exist(rendered);
                rendered.string.should.equal('\n<nav id="pagination" role="pagination">\n    \n        <div class="previous-page"><a href="/page/2/">Older Posts →</a></div>\n    \n    <div class="page-number">Page 1<span class="extended"> of 3</span></div>\n    \n</nav>');
                done();
            }).then(null, done);
        });

        it('can render middle pages of many with older and newer posts link', function (done) {
            var rendered;
            helpers.loadCoreHelpers(ghost).then(function () {
                rendered = handlebars.helpers.paginate.call({pagination: {page: 2, prev: 1, next: 3, limit: 15, total: 8, pages: 3}});
                should.exist(rendered);
                rendered.string.should.equal('\n<nav id="pagination" role="pagination">\n    \n        <div class="previous-page"><a href="/page/3/">Older Posts →</a></div>\n    \n    <div class="page-number">Page 2<span class="extended"> of 3</span></div>\n    \n        <div class="next-page"><a href="/page/1/">← Newer Posts</a></div>\n    \n</nav>');
                done();
            }).then(null, done);
        });

        it('can render last page of many with newer posts link', function (done) {
            var rendered;
            helpers.loadCoreHelpers(ghost).then(function () {
                rendered = handlebars.helpers.paginate.call({pagination: {page: 3, prev: 2, next: null, limit: 15, total: 8, pages: 3}});
                should.exist(rendered);
                rendered.string.should.equal('\n<nav id="pagination" role="pagination">\n    \n    <div class="page-number">Page 3<span class="extended"> of 3</span></div>\n    \n        <div class="next-page"><a href="/page/2/">← Newer Posts</a></div>\n    \n</nav>');
                done();
            }).then(null, done);
        });

        it('validates values', function (done) {
            helpers.loadCoreHelpers(ghost).then(function () {
                var runErrorTest = function (data) {
                    return function () {
                        handlebars.helpers.paginate.call(data);
                    };
                };

                runErrorTest({pagination: {page: 3, prev: true, next: null, limit: 15, total: 8, pages: 3}})
                    .should.throwError('Invalid value, Next/Prev must be a number or null');
                runErrorTest({pagination: {page: 3, prev: 2, next: true, limit: 15, total: 8, pages: 3}})
                    .should.throwError('Invalid value, Next/Prev must be a number or null');

                runErrorTest({pagination: {prev: 2, next: null, limit: 15, total: 8, pages: 3}})
                    .should.throwError('All values must be defined for page, pages, limit, total, prev and next');
                runErrorTest({pagination: {page: 3, next: null, limit: 15, total: 8, pages: 3}})
                    .should.throwError('All values must be defined for page, pages, limit, total, prev and next');
                runErrorTest({pagination: {page: 3, prev: 2, next: null, total: 8, pages: 3}})
                    .should.throwError('All values must be defined for page, pages, limit, total, prev and next');
                runErrorTest({pagination: {page: 3, prev: 2, next: null, limit: 15,pages: 3}})
                    .should.throwError('All values must be defined for page, pages, limit, total, prev and next');
                runErrorTest({pagination: {page: 3, prev: 2, next: null, limit: 15, total: 8}})
                    .should.throwError('All values must be defined for page, pages, limit, total, prev and next');

                runErrorTest({pagination: {page: null, prev: 2, next: null, limit: 15, total: 8, pages: 3}})
                    .should.throwError('Invalid value, check page, pages, limit and total are numbers');
                runErrorTest({pagination: {page: 1, prev: 2, next: null, limit: null, total: 8, pages: 3}})
                    .should.throwError('Invalid value, check page, pages, limit and total are numbers');
                runErrorTest({pagination: {page: 1, prev: 2, next: null, limit: 15, total: null, pages: 3}})
                    .should.throwError('Invalid value, check page, pages, limit and total are numbers');
                runErrorTest({pagination: {page: 1, prev: 2, next: null, limit: 15, total: 8, pages: null}})
                    .should.throwError('Invalid value, check page, pages, limit and total are numbers');

                done();
            }).then(null, done);
        });
    });
});