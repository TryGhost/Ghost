import { trimHash, trimSearch, trimSearchAndHash } from '@/settings/utils/url';

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
