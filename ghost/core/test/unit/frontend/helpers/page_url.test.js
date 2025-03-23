const should = require('should');

// Stuff we are testing
const page_url = require('../../../../core/frontend/helpers/page_url');

describe('{{page_url}} helper', function () {
    const options = {data: {root: {pagination: {}}}};

    beforeEach(function () {
        options.data.root = {pagination: {}};
    });

    it('can return a valid url when the relative URL is /', function () {
        options.data.root.relativeUrl = '/';
        options.data.root.pagination.next = 3;
        options.data.root.pagination.prev = 6;

        page_url(1, options).should.equal('/');
        page_url(2, options).should.equal('/page/2/');
        page_url(50, options).should.equal('/page/50/');
        page_url('next', options).should.eql('/page/3/');
        page_url('prev', options).should.eql('/page/6/');
    });

    it('can return a valid url when the relative url has a path', function () {
        options.data.root.relativeUrl = '/tag/pumpkin/';
        options.data.root.pagination.next = 10;
        options.data.root.pagination.prev = 2;

        page_url(1, options).should.equal('/tag/pumpkin/');
        page_url(2, options).should.equal('/tag/pumpkin/page/2/');
        page_url(50, options).should.equal('/tag/pumpkin/page/50/');
        page_url('next', options).should.eql('/tag/pumpkin/page/10/');
        page_url('prev', options).should.eql('/tag/pumpkin/page/2/');
    });

    it('should assume 1 if page is undefined', function () {
        options.data.root.relativeUrl = '/tag/pumpkin/';
        options.data.root.pagination.next = 10;
        options.data.root.pagination.prev = 2;

        page_url(options).should.equal(page_url(1, options));
    });
});
