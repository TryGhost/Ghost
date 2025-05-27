import {arePathsEqual, trimHash, trimSearch, trimSearchAndHash} from '../../../src/utils/url';
import {describe, it} from 'vitest';
import {expect} from 'vitest';

describe('trimSearch', function () {
    it('removes the query parameters from a URL', function () {
        const url = 'https://example.com/?foo=bar&baz=qux';
        const parsedUrl = new URL(url);

        expect(trimSearch(parsedUrl).toString()).toBe('https://example.com/');
    });
});

describe('trimHash', function () {
    it('removes the hash fragment from a URL', function () {
        const url = 'https://example.com/path#section-1';
        const parsedUrl = new URL(url);

        expect(trimHash(parsedUrl).toString()).toBe('https://example.com/path');
    });
});

describe('trimSearchAndHash', function () {
    it('removes the hash fragment from a URL', function () {
        const url = 'https://example.com/path#section-1?foo=bar&baz=qux';
        const parsedUrl = new URL(url);

        expect(trimSearchAndHash(parsedUrl).toString()).toBe('https://example.com/path');
    });
});

describe('arePathsEqual', function () {
    it('returns false if one of the param is not a URL', function () {
        const url1 = 'foo';
        const url2 = 'https://example.com';

        expect(arePathsEqual(url1, url2)).toBe(false);
    });

    it('returns false if hostnames are different', function () {
        const url1 = 'https://a.com';
        const url2 = 'https://b.com';

        expect(arePathsEqual(url1, url2)).toBe(false);
    });

    it('returns false if top level domains are different', function () {
        const url1 = 'https://a.io';
        const url2 = 'https://a.com';

        expect(arePathsEqual(url1, url2)).toBe(false);
    });

    it('returns false if sub domains are different', function () {
        const url1 = 'https://sub.a.com';
        const url2 = 'https://subdiff.a.com';

        expect(arePathsEqual(url1, url2)).toBe(false);
    });

    it('returns false if paths are different', function () {
        const url1 = 'https://a.com/path-1';
        const url2 = 'https://a.com/path-2';

        expect(arePathsEqual(url1, url2)).toBe(false);
    });

    it('returns true even if protocols are different', function () {
        const url1 = 'http://a.com';
        const url2 = 'https://a.com';

        expect(arePathsEqual(url1, url2)).toBe(true);
    });

    it('returns true even if www is used in one of the urls', function () {
        const url1 = 'https://www.a.com';
        const url2 = 'https://a.com';

        expect(arePathsEqual(url1, url2)).toBe(true);
    });

    it('returns true even if query parameters are different', function () {
        const url1 = 'http://a.com?foo=bar';
        const url2 = 'http://a.com';

        expect(arePathsEqual(url1, url2)).toBe(true);
    });

    it('returns true even if hash segments are different', function () {
        const url1 = 'http://a.com#segment-1';
        const url2 = 'http://a.com';

        expect(arePathsEqual(url1, url2)).toBe(true);
    });
});
