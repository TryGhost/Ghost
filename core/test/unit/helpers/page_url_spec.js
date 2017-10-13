var should = require('should'), // jshint ignore:line

// Stuff we are testing
    helpers = require('../../../server/helpers');

describe('{{page_url}} helper', function () {
    var options = {data: {root: {pagination: {}}}};

    beforeEach(function () {
        options.data.root = {pagination: {}};
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
