import * as assert from 'assert/strict';
import {trimHash, trimSearch, trimSearchAndHash} from '../../../src/utils/url';

describe('trimSearch', function () {
    it('removes the query parameters from a URL', function () {
        const url = 'https://example.com/?foo=bar&baz=qux';
        const parsedUrl = new URL(url);

        assert.equal(trimSearch(parsedUrl).toString(), 'https://example.com/');
    });
});

describe('trimHash', function () {
    it('removes the hash fragment from a URL', function () {
        const url = 'https://example.com/path#section-1';
        const parsedUrl = new URL(url);

        assert.equal(trimHash(parsedUrl).toString(), 'https://example.com/path');
    });
});

describe('trimSearchAndHash', function () {
    it('removes the hash fragment from a URL', function () {
        const url = 'https://example.com/path#section-1?foo=bar&baz=qux';
        const parsedUrl = new URL(url);

        assert.equal(trimSearchAndHash(parsedUrl).toString(), 'https://example.com/path');
    });
});
