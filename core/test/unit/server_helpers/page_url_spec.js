/*globals describe, before, beforeEach, it*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars      = hbs.handlebars,
    helpers         = require('../../../server/helpers');

describe('{{page_url}} helper', function () {
    var options = {data: {root: {pagination: {}}}};

    before(function () {
        utils.loadHelpers();
    });

    beforeEach(function () {
        options.data.root = {pagination: {}};
    });

    it('has loaded page_url helper', function () {
        should.exist(handlebars.helpers.page_url);
    });

    it('can return a valid url when the relative URL is /', function () {
        options.data.root.relativeUrl = '/';
        options.data.root.pagination.next = 3;
        options.data.root.pagination.prev = 6;

        helpers.page_url(1, options).should.equal('/');
        helpers.page_url(2, options).should.equal('/page/2/');
        helpers.page_url(50, options).should.equal('/page/50/');
        helpers.page_url('next', options).should.eql('/page/3/');
        helpers.page_url('prev', options).should.eql('/page/6/');
    });

    it('can return a valid url when the relative url has a path', function () {
        options.data.root.relativeUrl = '/tag/pumpkin/';
        options.data.root.pagination.next = 10;
        options.data.root.pagination.prev = 2;

        helpers.page_url(1, options).should.equal('/tag/pumpkin/');
        helpers.page_url(2, options).should.equal('/tag/pumpkin/page/2/');
        helpers.page_url(50, options).should.equal('/tag/pumpkin/page/50/');
        helpers.page_url('next', options).should.eql('/tag/pumpkin/page/10/');
        helpers.page_url('prev', options).should.eql('/tag/pumpkin/page/2/');
    });

    it('should assume 1 if page is undefined', function () {
        options.data.root.relativeUrl = '/tag/pumpkin/';
        options.data.root.pagination.next = 10;
        options.data.root.pagination.prev = 2;

        helpers.page_url(options).should.equal(helpers.page_url(1, options));
    });
});

describe('{{pageUrl}} helper [DEPRECATED]', function () {
    var options = {data: {root: {pagination: {}}}};

    before(function () {
        utils.loadHelpers();
    });

    it('has loaded pageUrl helper', function () {
        should.exist(handlebars.helpers.pageUrl);
    });

    it('should do the same thing as page_url when the relative URL is /', function () {
        options.data.root.relativeUrl = '/';
        options.data.root.pagination.next = 5;
        options.data.root.pagination.prev = 7;

        helpers.pageUrl(options).should.eql(helpers.page_url(options));
        helpers.pageUrl(1, options).should.eql(helpers.page_url(1, options));
        helpers.pageUrl(20, options).should.eql(helpers.page_url(20, options));
        helpers.pageUrl('next', options).should.eql(helpers.page_url('next', options));
        helpers.pageUrl('prev', options).should.eql(helpers.page_url('prev', options));
    });

    it('should do the same thing as page_url when the relative url has a path', function () {
        options.data.root.relativeUrl = '/tag/pumpkin/';
        options.data.root.pagination.next = 12;
        options.data.root.pagination.prev = 9;

        helpers.pageUrl(options).should.eql(helpers.page_url(options));
        helpers.pageUrl(1, options).should.eql(helpers.page_url(1, options));
        helpers.pageUrl(20, options).should.eql(helpers.page_url(20, options));
        helpers.pageUrl('next', options).should.eql(helpers.page_url('next', options));
        helpers.pageUrl('prev', options).should.eql(helpers.page_url('prev', options));
    });
});
