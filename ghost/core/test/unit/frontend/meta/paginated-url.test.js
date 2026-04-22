const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const getPaginatedUrl = require('../../../../core/frontend/meta/paginated-url');
const configUtils = require('../../../utils/config-utils');

describe('getPaginatedUrl', function () {
    let data;
    const siteUrl = () => configUtils.config.get('url');

    beforeEach(function () {
        data = {};
    });

    const getTestUrls = function getTestUrls() {
        return {
            next: getPaginatedUrl('next', data, true),
            prev: getPaginatedUrl('prev', data, true),
            page1: getPaginatedUrl(1, data),
            page5: getPaginatedUrl(5, data),
            page10: getPaginatedUrl(10, data)
        };
    };

    it('should be a function', function () {
        assertExists(getPaginatedUrl);
    });

    describe('index', function () {
        it('should calculate correct urls for the first page of an index collection', function () {
            // Setup tests
            data.relativeUrl = '/';
            data.pagination = {prev: null, next: 2};

            // Execute test
            const urls = getTestUrls();

            // Check results
            assert.equal(urls.next, `${siteUrl()}/page/2/`);
            assert.equal(urls.prev, null);
            assert.equal(urls.page1, '/');
            assert.equal(urls.page5, '/page/5/');
            assert.equal(urls.page10, '/page/10/');
        });

        it('should calculate correct urls for the second page of an index collection', function () {
            // Setup tests
            data.relativeUrl = '/page/2/';
            data.pagination = {prev: 1, next: 3};

            // Execute test
            const urls = getTestUrls();

            // Check results
            assert.equal(urls.next, `${siteUrl()}/page/3/`);
            assert.equal(urls.prev, `${siteUrl()}/`);
            assert.equal(urls.page1, '/');
            assert.equal(urls.page5, '/page/5/');
            assert.equal(urls.page10, '/page/10/');
        });

        it('should calculate correct urls for the last page of an index collection', function () {
            // Setup tests
            data.relativeUrl = '/page/10/';
            data.pagination = {prev: 9, next: null};

            // Execute test
            const urls = getTestUrls();

            // Check results
            assert.equal(urls.next, null);
            assert.equal(urls.prev, `${siteUrl()}/page/9/`);
            assert.equal(urls.page1, '/');
            assert.equal(urls.page5, '/page/5/');
            assert.equal(urls.page10, '/page/10/');
        });
    });

    describe('other', function () {
        it('should calculate correct urls for the first page of another collection', function () {
            // Setup tests
            data.relativeUrl = '/featured/';
            data.pagination = {prev: null, next: 2};

            // Execute test
            const urls = getTestUrls();

            // Check results
            assert.equal(urls.next, `${siteUrl()}/featured/page/2/`);
            assert.equal(urls.prev, null);
            assert.equal(urls.page1, '/featured/');
            assert.equal(urls.page5, '/featured/page/5/');
            assert.equal(urls.page10, '/featured/page/10/');
        });

        it('should calculate correct urls for the second page of another collection', function () {
            // Setup tests
            data.relativeUrl = '/featured/page/2/';
            data.pagination = {prev: 1, next: 3};

            // Execute test
            const urls = getTestUrls();

            // Check results
            assert.equal(urls.next, `${siteUrl()}/featured/page/3/`);
            assert.equal(urls.prev, `${siteUrl()}/featured/`);
            assert.equal(urls.page1, '/featured/');
            assert.equal(urls.page5, '/featured/page/5/');
            assert.equal(urls.page10, '/featured/page/10/');
        });

        it('should calculate correct urls for the last page of another collection', function () {
            // Setup tests
            data.relativeUrl = '/featured/page/10/';
            data.pagination = {prev: 9, next: null};

            // Execute test
            const urls = getTestUrls();

            // Check results
            assert.equal(urls.next, null);
            assert.equal(urls.prev, `${siteUrl()}/featured/page/9/`);
            assert.equal(urls.page1, '/featured/');
            assert.equal(urls.page5, '/featured/page/5/');
            assert.equal(urls.page10, '/featured/page/10/');
        });
    });

    describe('with /blog subdirectory', function () {
        before(function () {
            configUtils.set({url: 'http://localhost:65535/blog'});
        });

        after(async function () {
            await configUtils.restore();
        });

        it('should calculate correct urls for index', function () {
            // Setup tests
            data.relativeUrl = '/page/2/';
            data.pagination = {prev: 1, next: 3};

            // Execute test
            const urls = getTestUrls();

            // Check results
            assert.equal(urls.next, 'http://localhost:65535/blog/page/3/');
            assert.equal(urls.prev, 'http://localhost:65535/blog/');
            assert.equal(urls.page1, '/blog/');
            assert.equal(urls.page5, '/blog/page/5/');
            assert.equal(urls.page10, '/blog/page/10/');
        });

        it('should calculate correct urls for another collection', function () {
            // Setup tests
            data.relativeUrl = '/featured/page/2/';
            data.pagination = {prev: 1, next: 3};

            // Execute test
            const urls = getTestUrls();

            // Check results
            assert.equal(urls.next, 'http://localhost:65535/blog/featured/page/3/');
            assert.equal(urls.prev, 'http://localhost:65535/blog/featured/');
            assert.equal(urls.page1, '/blog/featured/');
            assert.equal(urls.page5, '/blog/featured/page/5/');
            assert.equal(urls.page10, '/blog/featured/page/10/');
        });
    });
});
