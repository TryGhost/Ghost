import { describe, expect, it } from 'vitest';

import { checkAdminApiRequest } from '../../src/bridge/index.ts';
import type { FetchMethod } from '../../src/bridge/rules.ts';
import { APP_PERMISSION_KEYS, type AppPermissionKey } from '../../src/scopes.ts';

const root = new URL('https://site.example/ghost/api/admin/');

// Every scope but the stats one, unless a test says otherwise.
const APPROVED = new Set(APP_PERMISSION_KEYS.filter((name) => name !== 'post:readStats'));

const check = (
  path: string,
  method: FetchMethod = 'GET',
  apiRoot = root,
  body?: string,
  approved: ReadonlySet<AppPermissionKey> = APPROVED,
) => checkAdminApiRequest({ path, method, body }, apiRoot, approved);

// The URL a path resolves to, or null when it is not an Admin API path. No path these tests
// resolve is one a server gap refuses, except in the tests about the gaps.
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
    expect(resolved('/tags/')).toBe('https://site.example/ghost/api/admin/tags/');
    expect(resolved('/tags/?limit=5&page=2')).toBe(
      'https://site.example/ghost/api/admin/tags/?limit=5&page=2',
    );
    expect(landsOn('/')).toBe('/');
    expect(landsOn('/a:b/')).toBe('/a:b/');
  });

  it('returns a new URL, leaving the root alone', () => {
    const result = check('/tags/');
    expect(result.problem).toBeUndefined();
    expect((result as { url: URL }).url).not.toBe(root);
    expect(root.href).toBe('https://site.example/ghost/api/admin/');
  });

  it('names the path within the API and the server gaps covered on it', () => {
    expect(check('/tags/?limit=5')).toMatchObject({ pathname: '/tags/', gaps: [] });
    expect(check('/posts/?limit=5')).toMatchObject({ pathname: '/posts/', gaps: ['postFields'] });
    expect(check('/site/')).toMatchObject({ pathname: '/site/', gaps: [] });
  });

  it('works with a root written without its trailing slash, a query or a fragment', () => {
    expect(resolved('/tags/', new URL('https://site.example/ghost/api/admin'))).toBe(
      'https://site.example/ghost/api/admin/tags/',
    );
    expect(resolved('/tags/', new URL('https://site.example/ghost/api/admin/?a=b#c'))).toBe(
      'https://site.example/ghost/api/admin/tags/',
    );
    expect(resolved('/tags/', new URL('https://site.example'))).toBe('https://site.example/tags/');
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

  it('allows .. that stays within the root, so the gaps are read where it lands', () => {
    expect(resolved('/posts/%2e%2e/tags/')).toBe('https://site.example/ghost/api/admin/tags/');
    expect(check('/tags/%2e%2e/posts/bulk/', 'PUT')).toEqual({
      problem: 'blocked',
      pathname: '/posts/bulk/',
      detail: "Apps can't use PUT /posts/bulk/",
      gap: 'bulkEdit',
    });
  });

  // Until Ghost's server refuses an app on every route no scope opens, the bridge does.
  it('refuses a route the app routes don’t list', () => {
    for (const [method, path] of [
      ['GET', '/db/?include=all'],
      ['DELETE', '/posts/?filter=tag:news'],
      ['GET', '/settings/'],
      ['GET', '/users/5ddc9141c35e7700383b2937/token/'],
      ['POST', '/webhooks/'],
      ['POST', '/site/'],
      ['GET', '/no/such/route/'],
    ] as const) {
      const pathname = path.split('?')[0];
      expect(check(path, method), `${method} ${path}`).toEqual({
        problem: 'blocked',
        pathname,
        detail: `Apps can't use ${method} ${pathname}`,
      });
    }
    // A parameter is any one segment, as Ghost's router reads it, so this is sent as the read
    // of a post it would be routed as if no route named it, and the server answers.
    expect(check('/posts/export/').problem).toBeUndefined();
  });

  // It needs none of the app's scopes: the server holds the route to them.
  it('doesn’t check that a route’s scope was approved', () => {
    const none = new Set<AppPermissionKey>();
    expect(check('/tags/', 'GET', root, undefined, none).problem).toBeUndefined();
    expect(check('/posts/', 'POST', root, '{"posts":[{"title":"Hi"}]}', none).problem).toBe(
      undefined,
    );
    // The site's public details are sent too, however the path is cased.
    expect(check('/site/', 'GET', root, undefined, none).problem).toBeUndefined();
    expect(check('/SITE', 'GET', root, undefined, none).problem).toBeUndefined();
  });

  it('reads the gaps the same whichever way the root is written', () => {
    for (const apiRoot of [
      'https://site.example/ghost/api/admin',
      'https://site.example/ghost/api/admin/',
      'https://site.example/ghost/api/admin/?a=b#c',
      'https://site.example/',
      'https://site.example',
    ]) {
      expect(check('/posts/bulk/', 'PUT', new URL(apiRoot)), apiRoot).toMatchObject({
        problem: 'blocked',
        pathname: '/posts/bulk/',
      });
      expect(check('/posts/', 'GET', new URL(apiRoot)).problem, apiRoot).toBeUndefined();
    }
  });

  it('blocks a path with an empty segment, as the route it reaches can’t be told', () => {
    for (const path of ['/posts//bulk/', '/posts//', '/tags/slug//', '/a//']) {
      expect(check(path, 'PUT'), path).toMatchObject({
        problem: 'blocked',
        detail: expect.stringMatching(/: its path has an empty segment$/),
      });
    }
    expect(check('/tags/').problem).toBeUndefined();
  });

  // A parameter's value is Ghost's to read, and Ghost answers 400 to one it can't decode, so the
  // bridge sends it on rather than judging it.
  it('sends on a path whose parameter has a malformed escape', () => {
    for (const path of ['/tags/slug/%zz/', '/tags/slug/%E0%A4%A/']) {
      const result = check(path);
      expect(result.problem, path).toBeUndefined();
      expect(result.problem === undefined && result.url.pathname, path).toBe(
        `/ghost/api/admin${path}`,
      );
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

  // The bridge never passes an app's spelling of a query on: it reads the query strictly and
  // writes its own, so the server reads the parameters the bridge acted on.
  it('sends a query it wrote itself, with each value escaped whole', () => {
    for (const [written, sent] of [
      ['?limit=5&filter=tag:news', '?limit=5&filter=tag%3Anews'],
      [
        "?filter=canonical_url:'https%3A%2F%2Fexample.com%2F'",
        '?filter=canonical_url%3A%27https%3A%2F%2Fexample.com%2F%27',
      ],
      ['?filter=tag:[a,b]%2Bx:1', '?filter=tag%3A%5Ba%2Cb%5D%2Bx%3A1'],
      ['?filter=a+b&limit=all', '?filter=a%20b&limit=all'],
      ['?filter=a]=b', '?filter=a%5D%3Db'],
      ['?formats', '?formats='],
      ['?limit=5&&page=2&', '?limit=5&page=2'],
      ['?', ''],
      ['', ''],
    ] as const) {
      const result = check(`/tags/${written}`);
      expect(result.problem, written).toBeUndefined();
      expect((result as { url: URL }).url.search, written).toBe(sent);
    }
  });

  it('blocks a query it can’t send as every parser reads it', () => {
    const many = (count: number) =>
      Array.from({ length: count }, (_, index) => `p${index}=1`).join('&');
    for (const [query, detail] of [
      [
        'include[]=tags',
        "Apps can't send a query parameter named include[]: a name may only have letters, digits and _ (GET /posts/)",
      ],
      [
        '%69nclude=tags',
        "Apps can't send a query parameter named %69nclude: a name may only have letters, digits and _ (GET /posts/)",
      ],
      [
        'include=tags&include=authors',
        "Apps can't send the include parameter more than once (GET /posts/)",
      ],
      [
        'filter=%ff',
        "Apps can't send a filter parameter with a malformed escape in it (GET /posts/)",
      ],
      [many(101), "Apps can't send more than 100 query parameters (GET /posts/)"],
    ] as const) {
      expect(check(`/posts/?${query}`), query).toEqual({
        problem: 'blocked',
        pathname: '/posts/',
        detail,
      });
    }
    expect(check(`/posts/?${many(100)}`).problem).toBeUndefined();
    // Whichever route it is for, as the server would read it differently there too
    expect(check('/db/?a[]=1').problem).toBe('blocked');
  });

  it('applies every gap on the route in order, and names the one that refused', () => {
    const id = '5ddc9141c35e7700383b2937';
    // `/posts/bulk` is also `/posts/:id`, so a post write's gaps apply to it ahead of its own
    expect(check('/posts/bulk/?source=html', 'PUT')).toMatchObject({
      problem: 'blocked',
      gap: 'emailAndHtmlSource',
    });
    expect(check('/posts/bulk/', 'PUT', root, '{"bulk":{"mobiledoc":"{}"}}')).toMatchObject({
      problem: 'blocked',
      gap: 'scriptInContent',
    });
    expect(check('/posts/bulk/?include=sentiment', 'PUT')).toMatchObject({
      problem: 'blocked',
      gap: 'postFields',
    });
    expect(check('/posts/bulk/', 'PUT')).toMatchObject({ problem: 'blocked', gap: 'bulkEdit' });

    // A gap that passes the request on may rewrite its query for the next, and for the server
    const sent = check(`/posts/${id}/?formats=lexical`, 'PUT', root, '{"posts":[{}]}');
    expect(sent).toMatchObject({
      pathname: `/posts/${id}/`,
      gaps: ['emailAndHtmlSource', 'rerenderOrConvert', 'scriptInContent', 'postFields'],
    });
    expect((sent as { url: URL }).url.search).toBe(
      '?formats=lexical&include=tags%2Cauthors%2Ctiers%2Cnewsletter',
    );
  });

  it('leaves a request alone on a route with no gaps, whatever it carries', () => {
    const id = '5ddc9141c35e7700383b2937';
    expect(
      check(`/posts/${id}/?newsletter=weekly&include=sentiment`, 'DELETE', root, 'not json'),
    ).toMatchObject({ gaps: [] });
    expect(check('/tags/?include=count.posts&order=sentiment').problem).toBeUndefined();
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
    for (const path of ['/tags/?filter=@evil.example', '/tags/#@evil.example']) {
      expect(new URL(resolved(path)!).origin, path).toBe('https://site.example');
    }
  });
});
