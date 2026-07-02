const assert = require('node:assert/strict');
const getPageParam = require('../../../../../core/frontend/services/routing/page-param-config');
const {setPageParam, DEFAULT_PAGE_PARAM} = getPageParam;

describe('UNIT - services/routing/page-param-config', function () {
    afterEach(function () {
        setPageParam(DEFAULT_PAGE_PARAM);
    });

    it('returns "page" by default', function () {
        setPageParam('page');
        assert.equal(getPageParam(), 'page');
    });

    it('returns a valid custom value', function () {
        setPageParam('seite');
        assert.equal(getPageParam(), 'seite');
    });

    it('trims surrounding whitespace from a valid value', function () {
        setPageParam('  seite  ');
        assert.equal(getPageParam(), 'seite');
    });

    it('falls back to "page" for an empty value', function () {
        setPageParam('');
        assert.equal(getPageParam(), 'page');
    });

    it('falls back to "page" for a whitespace-only value', function () {
        setPageParam('   ');
        assert.equal(getPageParam(), 'page');
    });

    it('falls back to "page" for a non-string value', function () {
        setPageParam(undefined);
        assert.equal(getPageParam(), 'page');
    });

    it('falls back to "page" for values with unsafe url characters', function () {
        ['foo/bar', 'foo?bar', 'foo#bar', 'foo:bar', 'foo bar'].forEach((value) => {
            setPageParam(value);
            assert.equal(getPageParam(), 'page', `expected fallback for "${value}"`);
        });
    });

    it('falls back to "page" for reserved route segments', function () {
        ['tag', 'author', 'rss', 'amp', 'TAG'].forEach((value) => {
            setPageParam(value);
            assert.equal(getPageParam(), 'page', `expected fallback for "${value}"`);
        });
    });
});
