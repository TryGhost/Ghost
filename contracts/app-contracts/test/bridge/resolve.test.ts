import { describe, expect, it } from 'vitest';

import { checkAdminApiRequest } from '../../src/bridge/index.ts';
import type { FetchMethod } from '../../src/bridge/rules.ts';

const root = new URL('https://site.example/ghost/api/admin/');

const check = (path: string, method: FetchMethod = 'GET', apiRoot = root, body?: string) =>
  checkAdminApiRequest({ path, method, body }, apiRoot);

// The URL a path resolves to, or null when it is not an Admin API path. Every path these tests
// resolve is one apps can reach, except in the tests about the allowlist.
function resolved(path: string, apiRoot = root) {
  const result = check(path, 'GET', apiRoot);
  expect(result.problem, path).not.toBe('blocked');
  return result.problem ? null : result.url.href;
}

// Where a path lands within the API, whether apps can reach it or not, or null when it is not
// an Admin API path.
function landsOn(path: string, apiRoot = root) {
  const result = check(path, 'GET', apiRoot);
  return result.problem === 'invalid_path' ? null : result.pathname;
}

describe('checking an Admin API request', () => {
  it('resolves a leading / against the API root, not the origin', () => {
    expect(resolved('/posts/')).toBe('https://site.example/ghost/api/admin/posts/');
    expect(resolved('/posts/?limit=5&filter=tag:news')).toBe(
      'https://site.example/ghost/api/admin/posts/?limit=5&filter=tag:news',
    );
    expect(landsOn('/')).toBe('/');
    expect(landsOn('/a:b/')).toBe('/a:b/');
  });

  it('keeps an encoded value in the query string as it is', () => {
    expect(resolved("/posts/?filter=canonical_url:'https%3A%2F%2Fexample.com%2F'")).toBe(
      'https://site.example/ghost/api/admin/posts/?filter=canonical_url:%27https%3A%2F%2Fexample.com%2F%27',
    );
  });

  it('returns a new URL, leaving the root alone', () => {
    const result = check('/posts/');
    expect(result.problem).toBeUndefined();
    expect((result as { url: URL }).url).not.toBe(root);
    expect(root.href).toBe('https://site.example/ghost/api/admin/');
  });

  it('names the path within the API, as the allowlist read it, and the scope that allows it', () => {
    const result = check('/posts/?limit=5');
    expect(result).toMatchObject({ pathname: '/posts/' });
    expect(result.problem === undefined && result.scope.name).toBe('posts:read');
    expect(check('/')).toMatchObject({ pathname: '/' });
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

  it('allows .. that stays within the root, so the allowlist sees where it lands', () => {
    expect(resolved('/posts/%2e%2e/tags/')).toBe('https://site.example/ghost/api/admin/tags/');
    expect(check('/posts/%2e%2e/users/password/')).toEqual({
      problem: 'blocked',
      pathname: '/users/password/',
      detail: "Apps can't use GET /users/password/",
    });
  });

  it('blocks what the allowlist leaves out, naming the method and the path within the API', () => {
    expect(check('/db/?include=all')).toEqual({
      problem: 'blocked',
      pathname: '/db/',
      detail: "Apps can't use GET /db/",
    });
    expect(check('/posts/?filter=tag:news', 'DELETE')).toEqual({
      problem: 'blocked',
      pathname: '/posts/',
      detail: "Apps can't use DELETE /posts/",
    });
    expect(check('/posts/?filter=tag:news', 'GET')).toMatchObject({ pathname: '/posts/' });
  });

  it('blocks the same paths whichever way the root is written', () => {
    for (const apiRoot of [
      'https://site.example/ghost/api/admin',
      'https://site.example/ghost/api/admin/',
      'https://site.example/ghost/api/admin/?a=b#c',
      'https://site.example/',
      'https://site.example',
    ]) {
      expect(check('/db/', 'GET', new URL(apiRoot)), apiRoot).toMatchObject({
        problem: 'blocked',
        pathname: '/db/',
      });
      expect(check('/posts/', 'GET', new URL(apiRoot)).problem, apiRoot).toBeUndefined();
    }
  });

  // Ghost's rewrite for the API's old versioned addresses looks for `ghost/api` anywhere in the
  // address and removes the first `v4/` it finds, so both of these reached `/db/`.
  it('blocks a request that names an old API address, wherever it does', () => {
    for (const path of [
      '/v4/db/?x=ghost/api/v4/admin/',
      '/dbv4//?x=ghost/api/v4/admin/',
      '/posts/?filter=ghost/api',
      '/posts/?filter=GHOST/API',
      '/posts/?filter=ghost%2Fapi',
      '/posts/?filter=%67host%2fapi',
      '/v4/posts/',
      '/V3/posts/',
      '/canary/posts/',
      '/v2/',
    ]) {
      expect(check(path), path).toMatchObject({
        problem: 'blocked',
        detail: expect.stringMatching(/: it names an old API address$/),
      });
    }
    expect(check('/posts/?filter=tag:v4').problem).toBeUndefined();
    expect(check('/posts/slug/v4/').problem).toBeUndefined();
  });

  it('allows only the query parameters a write scope lists, by exact name', () => {
    const id = '5ddc9141c35e7700383b2937';
    for (const [method, path, parameter] of [
      ['PUT', `/posts/${id}/?newsletter=weekly`, 'newsletter'],
      ['PUT', `/posts/${id}/?formats=lexical&email_segment=all`, 'email_segment'],
      ['PUT', `/pages/${id}/?email_segment=status:free`, 'email_segment'],
      ['POST', '/posts/?source=html', 'source'],
      ['POST', '/pages/?SOURCE=html', 'SOURCE'],
      ['PUT', `/posts/${id}/?news%6cetter=weekly`, 'newsletter'],
      // Ghost's query parser reads each of these as `newsletter`, `email_segment` or `source`.
      ['PUT', `/posts/${id}/?[newsletter]=weekly`, '[newsletter]'],
      ['PUT', `/posts/${id}/?%5Bnewsletter%5D=weekly`, '[newsletter]'],
      ['PUT', `/posts/${id}/?[email_segment]=all`, '[email_segment]'],
      ['POST', '/posts/?[source]=html', '[source]'],
      ['PUT', `/posts/${id}/?newsletter[]=weekly`, 'newsletter[]'],
      ['PUT', `/posts/${id}/?newsletter%5Ba%5D=weekly`, 'newsletter[a]'],
      ['PUT', `/posts/${id}/?include[]=tags`, 'include[]'],
      ['PUT', `/posts/${id}/?newsletter`, 'newsletter'],
      ['PUT', `/posts/${id}/?force_rerender=true`, 'force_rerender'],
      ['PUT', `/posts/${id}/?anything=else`, 'anything'],
      ['PUT', `/tags/${id}/?formats=lexical`, 'formats'],
      ['DELETE', `/posts/${id}/?newsletter=weekly`, 'newsletter'],
    ] as const) {
      const pathname = path.split('?')[0];
      expect(check(path, method), `${method} ${path}`).toEqual({
        problem: 'blocked',
        pathname,
        detail: `Apps can't use the ${parameter} parameter on ${method} ${pathname}`,
      });
    }
    expect(
      check(`/posts/${id}/?formats=lexical&include=tags&save_revision=true`, 'PUT').problem,
    ).toBeUndefined();
    expect(check(`/tags/${id}/?include=count.posts`, 'PUT').problem).toBeUndefined();
    // A read takes any parameter.
    expect(check('/posts/?filter=newsletter:weekly&source=html').problem).toBeUndefined();
  });

  it('checks the content a write sends', () => {
    expect(check('/posts/', 'POST', root, '{"posts":[{"title":"Hello"}]}').problem).toBeUndefined();
    expect(
      check('/posts/', 'POST', root, '{"posts":[{"codeinjection_head":"<script></script>"}]}'),
    ).toEqual({
      problem: 'blocked',
      pathname: '/posts/',
      detail: "Apps can't send codeinjection_head to POST /posts/",
    });
    expect(check('/posts/', 'POST', root, 'posts[0][title]=x')).toEqual({
      problem: 'blocked',
      pathname: '/posts/',
      detail: 'Apps can only send JSON to POST /posts/',
    });
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
    expect(landsOn(`/${'a'.repeat(2047)}`)).not.toBeNull();
    expect(landsOn(`/${'a'.repeat(2048)}`)).toBeNull();
  });

  it('refuses a path that is not text', () => {
    expect(resolved(42 as unknown as string)).toBeNull();
    expect(resolved(null as unknown as string)).toBeNull();
  });

  it('never resolves to another origin', () => {
    for (const path of ['/@evil.example/', '/:443@evil.example/', '/%40evil.example']) {
      expect(landsOn(path), path).toBe(path);
    }
    for (const path of ['/posts/?x=@evil.example', '/posts/#@evil.example']) {
      expect(new URL(resolved(path)!).origin, path).toBe('https://site.example');
    }
  });
});
