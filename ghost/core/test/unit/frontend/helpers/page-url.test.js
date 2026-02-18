const assert = require('node:assert/strict');

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

        assert.equal(page_url(1, options), '/');
        assert.equal(page_url(2, options), '/page/2/');
        assert.equal(page_url(50, options), '/page/50/');
        assert.equal(page_url('next', options), '/page/3/');
        assert.equal(page_url('prev', options), '/page/6/');
    });

    it('can return a valid url when the relative url has a path', function () {
        options.data.root.relativeUrl = '/tag/pumpkin/';
        options.data.root.pagination.next = 10;
        options.data.root.pagination.prev = 2;

        assert.equal(page_url(1, options), '/tag/pumpkin/');
        assert.equal(page_url(2, options), '/tag/pumpkin/page/2/');
        assert.equal(page_url(50, options), '/tag/pumpkin/page/50/');
        assert.equal(page_url('next', options), '/tag/pumpkin/page/10/');
        assert.equal(page_url('prev', options), '/tag/pumpkin/page/2/');
    });

    it('should assume 1 if page is undefined', function () {
        options.data.root.relativeUrl = '/tag/pumpkin/';
        options.data.root.pagination.next = 10;
        options.data.root.pagination.prev = 2;

        assert.equal(page_url(options), page_url(1, options));
    });
});
