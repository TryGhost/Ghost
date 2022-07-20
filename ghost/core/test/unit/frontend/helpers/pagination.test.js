const should = require('should');
const hbs = require('../../../../core/frontend/services/theme-engine/engine');
const configUtils = require('../../../utils/configUtils');
const path = require('path');
const page_url = require('../../../../core/frontend/helpers/page_url');
const pagination = require('../../../../core/frontend/helpers/pagination');

describe('{{pagination}} helper', function () {
    before(function (done) {
        hbs.express4({partialsDir: [configUtils.config.get('paths').helperTemplates]});

        hbs.cachePartials(function () {
            done();
        });

        // The pagination partial expects this helper
        // @TODO: change to register with Ghost's own registration tools
        hbs.registerHelper('page_url', page_url);
    });

    const paginationRegex = /class="pagination"/;
    const newerRegex = /class="newer-posts"/;
    const olderRegex = /class="older-posts"/;
    const pageRegex = /class="page-number"/;

    it('should throw if pagination data is incorrect', function () {
        const runHelper = function (data) {
            return function () {
                pagination.call(data);
            };
        };

        const expectedMessage = 'The {{pagination}} helper was used outside of a paginated context. See https://ghost.org/docs/themes/helpers/pagination/.';

        runHelper('not an object').should.throwError(expectedMessage);
        runHelper(function () {
        }).should.throwError(expectedMessage);
    });

    it('can render single page with no pagination necessary', function () {
        const rendered = pagination.call({
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
        const rendered = pagination.call({
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
        const rendered = pagination.call({
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
        const rendered = pagination.call({
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
        const runErrorTest = function (data) {
            return function () {
                pagination.call(data);
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
        hbs.express4({partialsDir: [path.resolve(__dirname, './test_tpl')]});

        hbs.cachePartials(function () {
            done();
        });
    });

    it('can render single page with @site.title', function () {
        const rendered = pagination.call({
            pagination: {page: 1, prev: null, next: null, limit: 15, total: 8, pages: 1},
            tag: {slug: 'slug'}
        }, {
            data: {
                site: {
                    title: 'Chaos is a ladder.'
                }
            }
        });
        should.exist(rendered);
        // strip out carriage returns and compare.
        rendered.string.should.match(/Page 1 of 1/);
        rendered.string.should.containEql('Chaos is a ladder');
        rendered.string.should.not.containEql('isHeader is set');
    });

    it('can pass attributes through', function () {
        const rendered = pagination.call({
            pagination: {page: 1, prev: null, next: null, limit: 15, total: 8, pages: 1},
            tag: {slug: 'slug'}
        }, {
            hash: {isHeader: true},
            data: {
                site: {}
            }
        });
        should.exist(rendered);
        // strip out carriage returns and compare.
        rendered.string.should.match(/Page 1 of 1/);
        rendered.string.should.not.containEql('Chaos is a ladder');
        rendered.string.should.containEql('isHeader is set');
    });
});
