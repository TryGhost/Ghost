/*globals describe, before, it*/
/*jshint expr:true*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),
    path           = require('path'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{pagination}} helper', function () {
    before(function (done) {
        utils.loadHelpers();
        hbs.express3({partialsDir: [utils.config.paths.helperTemplates]});

        hbs.cachePartials(function () {
            done();
        });
    });

    var paginationRegex = /class="pagination"/,
        newerRegex = /class="newer-posts"/,
        olderRegex = /class="older-posts"/,
        pageRegex = /class="page-number"/;

    it('has loaded pagination helper', function () {
        should.exist(handlebars.helpers.pagination);
    });

    it('should throw if pagination data is incorrect', function () {
        var runHelper = function (data) {
            return function () {
                helpers.pagination.call(data);
            };
        };

        runHelper('not an object').should.throwError('pagination data is not an object or is a function');
        runHelper(function () {}).should.throwError('pagination data is not an object or is a function');
    });

    it('can render single page with no pagination necessary', function () {
        var rendered = helpers.pagination.call({
            pagination: {page: 1, prev: null, next: null, limit: 15, total: 8, pages: 1},
            tag: {slug: 'slug'}
        });
        should.exist(rendered);
        // strip out carriage returns and compare.
        rendered.string.should.match(paginationRegex);
        rendered.string.should.match(pageRegex);
        rendered.string.should.match(/Page 1 of 1/);
        rendered.string.should.not.match(newerRegex);
        rendered.string.should.not.match(olderRegex);
    });

    it('can render first page of many with older posts link', function () {
        var rendered = helpers.pagination.call({
            pagination: {page: 1, prev: null, next: 2, limit: 15, total: 8, pages: 3}
        });
        should.exist(rendered);

        rendered.string.should.match(paginationRegex);
        rendered.string.should.match(pageRegex);
        rendered.string.should.match(olderRegex);
        rendered.string.should.match(/Page 1 of 3/);
        rendered.string.should.not.match(newerRegex);
    });

    it('can render middle pages of many with older and newer posts link', function () {
        var rendered = helpers.pagination.call({
            pagination: {page: 2, prev: 1, next: 3, limit: 15, total: 8, pages: 3}
        });
        should.exist(rendered);

        rendered.string.should.match(paginationRegex);
        rendered.string.should.match(pageRegex);
        rendered.string.should.match(olderRegex);
        rendered.string.should.match(newerRegex);
        rendered.string.should.match(/Page 2 of 3/);
    });

    it('can render last page of many with newer posts link', function () {
        var rendered = helpers.pagination.call({
            pagination: {page: 3, prev: 2, next: null, limit: 15, total: 8, pages: 3}
        });
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

describe('{{pagination}} helper with custom template', function () {
    before(function (done) {
        utils.loadHelpers();
        hbs.express3({partialsDir: [path.resolve(utils.config.paths.corePath, 'test/unit/server_helpers/test_tpl')]});

        hbs.cachePartials(function () {
            done();
        });
    });

    it('can render single page with @blog.title', function () {
        var rendered = helpers.pagination.call({
            pagination: {page: 1, prev: null, next: null, limit: 15, total: 8, pages: 1},
            tag: {slug: 'slug'}
        }, {
            data: {
                blog: {
                    title: 'Chaos is a ladder.'
                }
            }
        });
        should.exist(rendered);
        // strip out carriage returns and compare.
        rendered.string.should.match(/Page 1 of 1/);
        rendered.string.should.containEql('Chaos is a ladder');
    });
});
