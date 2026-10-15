import { describe, expect, it } from 'vitest';

import { checkAdminApiPath } from '../../src/bridge/index.ts';

const root = new URL('https://site.example/ghost/api/admin/');

// The URL a path resolves to, or null when it is not an Admin API path. Every path in these
// tests is open to apps, except in the tests about the blocklist.
function resolved(path: string, apiRoot = root) {
  const check = checkAdminApiPath(path, apiRoot);
  expect(check.problem, path).not.toBe('blocked');
  return check.problem ? null : check.url.href;
}

describe('checking an Admin API path', () => {
  it('resolves a leading / against the API root, not the origin', () => {
    expect(resolved('/posts/')).toBe('https://site.example/ghost/api/admin/posts/');
    expect(resolved('/posts/?limit=5&filter=tag:news')).toBe(
      'https://site.example/ghost/api/admin/posts/?limit=5&filter=tag:news',
    );
    expect(resolved('/')).toBe('https://site.example/ghost/api/admin/');
    expect(resolved('/a:b/')).toBe('https://site.example/ghost/api/admin/a:b/');
  });

  it('keeps an encoded value in the query string as it is', () => {
    expect(resolved("/posts/?filter=canonical_url:'https%3A%2F%2Fexample.com%2F'")).toBe(
      'https://site.example/ghost/api/admin/posts/?filter=canonical_url:%27https%3A%2F%2Fexample.com%2F%27',
    );
  });

  it('returns a new URL, leaving the root alone', () => {
    const check = checkAdminApiPath('/posts/', root);
    expect(check.problem).toBeUndefined();
    expect((check as { url: URL }).url).not.toBe(root);
    expect(root.href).toBe('https://site.example/ghost/api/admin/');
  });

  it('names the path within the API, as the blocklist read it', () => {
    expect(checkAdminApiPath('/posts/?limit=5', root)).toMatchObject({ pathname: '/posts/' });
    expect(checkAdminApiPath('/', root)).toMatchObject({ pathname: '/' });
  });

  it('works with a root written without its trailing slash, a query or a fragment', () => {
    expect(resolved('/posts/', new URL('https://site.example/ghost/api/admin'))).toBe(
      'https://site.example/ghost/api/admin/posts/',
    );
    expect(resolved('/posts/', new URL('https://site.example/ghost/api/admin/?a=b#c'))).toBe(
      'https://site.example/ghost/api/admin/posts/',
    );
    expect(resolved('/posts/', new URL('https://site.example'))).toBe(
      'https://site.example/posts/',
    );
  });

  it('refuses absolute and protocol-relative URLs', () => {
    for (const path of [
      'https://evil.example/',
      'https://site.example/ghost/api/admin/posts/',
      'HTTPS://site.example/ghost/api/admin/posts/',
      'javascript:alert(1)',
      'data:text/plain,x',
      '//evil.example/ghost/api/admin/posts/',
      '//site.example/ghost/api/admin/posts/',
      '///evil.example/',
    ]) {
      expect(resolved(path), path).toBeNull();
    }
  });

  it('refuses a path that does not start with /', () => {
    for (const path of ['posts/', '', '?limit=5', '#x', '../posts/', ' /posts/']) {
      expect(resolved(path), path).toBeNull();
    }
  });

  it('refuses backslashes, which URL parsers read as /', () => {
    for (const path of ['/\\evil.example/', '\\\\evil.example', '/posts\\..\\..\\', '/posts/\\']) {
      expect(resolved(path), path).toBeNull();
    }
  });

  it('refuses control characters, which URL parsers strip', () => {
    for (const path of ['/\t/evil.example/', '/\n/evil.example', '/posts/\r', '/\u0000']) {
      expect(resolved(path), path).toBeNull();
    }
  });

  it('refuses .. in every spelling that climbs out of the root', () => {
    for (const path of [
      '/..',
      '/../',
      '/../../../',
      '/../content/',
      '/../../admin/posts/',
      '/posts/../../',
      '/%2e%2e/',
      '/%2E%2E/',
      '/.%2e/',
      '/%2e./',
      '/posts/%2e%2e/%2e%2e/content/',
      '/./../',
    ]) {
      expect(resolved(path), path).toBeNull();
    }
  });

  it('refuses a sibling path that only shares the root as a prefix', () => {
    expect(resolved('/../admin2/')).toBeNull();
    expect(resolved('/../admin-evil/posts/')).toBeNull();
  });

  it('allows .. that stays within the root, so the blocklist sees where it lands', () => {
    expect(resolved('/posts/%2e%2e/tags/')).toBe('https://site.example/ghost/api/admin/tags/');
    expect(checkAdminApiPath('/posts/%2e%2e/users/password/', root)).toEqual({
      problem: 'blocked',
      pathname: '/users/password/',
    });
  });

  it('blocks what the blocklist closes, naming the path within the API', () => {
    expect(checkAdminApiPath('/db/?include=all', root)).toEqual({
      problem: 'blocked',
      pathname: '/db/',
    });
    expect(checkAdminApiPath('/members/abc/signin_urls/', root)).toEqual({
      problem: 'blocked',
      pathname: '/members/abc/signin_urls/',
    });
  });

  it('blocks the same paths whichever way the root is written', () => {
    for (const apiRoot of [
      'https://site.example/ghost/api/admin',
      'https://site.example/ghost/api/admin/',
      'https://site.example/ghost/api/admin/?a=b#c',
      'https://site.example/',
      'https://site.example',
    ]) {
      expect(checkAdminApiPath('/db/', new URL(apiRoot)), apiRoot).toEqual({
        problem: 'blocked',
        pathname: '/db/',
      });
      expect(checkAdminApiPath('/users/abc/token', new URL(apiRoot)), apiRoot).toMatchObject({
        problem: 'blocked',
      });
    }
  });

  it('refuses escaped separators, which a later reader may decode', () => {
    for (const path of [
      '/..%2f..%2fcontent',
      '/posts%2F..%2F..%2F',
      '/..%5c..%5ccontent',
      '/posts/%5C',
    ]) {
      expect(resolved(path), path).toBeNull();
    }
  });

  it('refuses a path that is too long', () => {
    expect(resolved(`/${'a'.repeat(2047)}`)).not.toBeNull();
    expect(resolved(`/${'a'.repeat(2048)}`)).toBeNull();
  });

  it('refuses a path that is not text', () => {
    expect(resolved(42 as unknown as string)).toBeNull();
    expect(resolved(null as unknown as string)).toBeNull();
  });

  it('never resolves to another origin', () => {
    for (const path of ['/@evil.example/', '/:443@evil.example/', '/%40evil.example']) {
      expect(new URL(resolved(path)!).origin).toBe('https://site.example');
    }
  });
});
