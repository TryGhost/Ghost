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
    expect(resolved('/tags/')).toBe('https://site.example/ghost/api/admin/tags/');
    expect(resolved('/tags/?limit=5&filter=tag:news')).toBe(
      'https://site.example/ghost/api/admin/tags/?limit=5&filter=tag:news',
    );
    expect(landsOn('/')).toBe('/');
    expect(landsOn('/a:b/')).toBe('/a:b/');
  });

  it('keeps an encoded value in the query string as it is', () => {
    expect(resolved("/tags/?filter=canonical_url:'https%3A%2F%2Fexample.com%2F'")).toBe(
      'https://site.example/ghost/api/admin/tags/?filter=canonical_url:%27https%3A%2F%2Fexample.com%2F%27',
    );
  });

  it('returns a new URL, leaving the root alone', () => {
    const result = check('/tags/');
    expect(result.problem).toBeUndefined();
    expect((result as { url: URL }).url).not.toBe(root);
    expect(root.href).toBe('https://site.example/ghost/api/admin/');
  });

  it('names the path within the API, as the allowlist read it, and the group that allows it', () => {
    const result = check('/tags/?limit=5');
    expect(result).toMatchObject({ pathname: '/tags/' });
    expect(result.problem === undefined && result.group.scope).toBe('tag:browse');
    expect(check('/')).toMatchObject({ pathname: '/' });
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

  it('allows only the query parameters a group lists, by exact name', () => {
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
    // A read takes only what Ghost reads for it, too.
    expect(check('/tags/?filter=visibility:public&anything=else').problem).toBe('blocked');
  });

  it('refuses a route whose scope the installation wasn’t approved for', () => {
    const approved = new Set<AppPermissionKey>(['post:browse']);
    expect(check('/posts/', 'GET', root, undefined, approved).problem).toBeUndefined();
    expect(check('/tags/', 'GET', root, undefined, approved)).toEqual({
      problem: 'blocked',
      pathname: '/tags/',
      detail: "This app wasn't approved for tag:browse, which GET /tags/ needs",
    });
    expect(check('/posts/', 'POST', root, '{"posts":[{"title":"Hi"}]}', approved).problem).toBe(
      'blocked',
    );
    // The site's public details need no scope.
    expect(check('/site/', 'GET', root, undefined, new Set()).problem).toBeUndefined();
  });

  // Ghost includes how a post performed when a request names nothing, so the bridge names what
  // the app may have instead.
  it('names the includes an app may have when it names none', () => {
    const include = (path: string, approved: ReadonlySet<AppPermissionKey> = APPROVED) => {
      const result = check(path, 'GET', root, undefined, approved);
      return result.problem ? result.problem : result.url.searchParams.get('include');
    };
    expect(include('/posts/')).toBe('tags,authors,tiers,newsletter');
    expect(include('/pages/?include=,')).toBe('tags,authors,tiers');
    expect(include('/posts/?include=%20')).toBe('tags,authors,tiers,newsletter');
    expect(include('/posts/', new Set(['post:browse']))).toBe('authors');
    expect(include('/posts/', new Set([...APPROVED, 'post:readStats']))).toBe(
      'tags,authors,email,tiers,newsletter,count.clicks',
    );
    expect(include('/pages/', new Set(['post:browse', 'post:readStats']))).toBe(
      'authors,count.signups,count.paid_conversions',
    );
    // What an app names is left as it is.
    expect(include('/posts/?include=tags')).toBe('tags');
    // An empty `fields` asks for nothing, so Ghost would add its defaults, how the post
    // performed included.
    expect(include('/posts/?fields=', new Set(['post:browse']))).toBe('authors');
    expect(include('/pages/?fields=', new Set(['post:browse']))).toBe('authors');
    expect(include('/posts/5ddc9141c35e7700383b2937/?fields=', new Set(['post:read']))).toBe(
      'authors',
    );
    // Asking for some fields, Ghost adds no defaults, so neither does the bridge.
    expect(include('/posts/?fields=id,title')).toBeNull();
    expect(include('/posts/?fields=%20')).toBeNull();
    expect(include('/posts/?fields=&fields=')).toBeNull();
    // The rest of the query keeps the spelling the app sent.
    const result = check("/posts/?filter=slug:'a%2Cb'&include=&limit=5");
    expect(result.problem === undefined && result.url.search).toBe(
      '?filter=slug:%27a%2Cb%27&limit=5&include=tags,authors,tiers,newsletter',
    );
    // Writes answer with the post too, and other routes take no include.
    const id = '5ddc9141c35e7700383b2937';
    const written = check(`/posts/${id}/`, 'PUT', root, '{"posts":[{"title":"Hi"}]}');
    expect(written.problem === undefined && written.url.searchParams.get('include')).toBe(
      'tags,authors,tiers,newsletter',
    );
    expect(include('/search-index/posts/')).toBeNull();
    expect(include('/tags/')).toBeNull();
  });

  it('needs the related object’s scope to include it', () => {
    const approved = new Set<AppPermissionKey>(['post:browse']);
    for (const [relation, scope] of [
      ['tags', 'tag:browse'],
      ['tiers', 'product:browse'],
      ['newsletter', 'newsletter:browse'],
    ] as const) {
      expect(check(`/posts/?include=${relation}`, 'GET', root, undefined, approved)).toMatchObject({
        detail: `This app wasn't approved for ${scope}, which including ${relation} needs`,
      });
    }
    expect(
      check('/posts/?include=authors,post_revisions', 'GET', root, undefined, approved).problem,
    ).toBeUndefined();
    for (const relation of ['authors.roles', 'post_revisions.author']) {
      expect(check(`/posts/?include=${relation}`).problem, relation).toBe('blocked');
    }
  });

  it('refuses newsletters’ member counts, as no scope grants member data yet', () => {
    const approved = new Set<AppPermissionKey>(['newsletter:browse']);
    for (const relation of ['count.members', 'count.active_members']) {
      expect(
        check(`/newsletters/?include=${relation}`, 'GET', root, undefined, approved),
      ).toMatchObject({
        problem: 'blocked',
        detail: `Apps can't include ${relation} on GET /newsletters/`,
      });
    }
    expect(
      check('/newsletters/?include=count.posts', 'GET', root, undefined, approved).problem,
    ).toBeUndefined();
  });

  it('refuses an include spelled as an array, which Ghost’s query parser reads as include', () => {
    const approved = new Set<AppPermissionKey>(['newsletter:browse', 'post:browse', 'post:read']);
    const id = '5ddc9141c35e7700383b2937';
    for (const path of [
      '/newsletters/?include[]=count.members',
      '/newsletters/?include[0]=count.members',
      '/newsletters/?include%5B%5D=count.members',
      '/posts/?include[]=email',
      '/pages/?include[0]=count.signups',
      `/posts/${id}/?include[]=email`,
    ]) {
      expect(check(path, 'GET', root, undefined, approved).problem, path).toBe('blocked');
    }
  });

  it('takes only the parameters Ghost reads on every route, so none slips past a check', () => {
    const id = '5ddc9141c35e7700383b2937';
    for (const path of [
      '/tags/?include[]=count.posts',
      `/tags/${id}/?debug=true`,
      '/tiers/?include[]=monthly_price',
      '/users/?debug=true',
      '/slugs/post/hello/?include=x',
      '/site/?debug=true',
    ]) {
      expect(check(path).problem, path).toBe('blocked');
    }
    for (const path of [
      '/tags/?limit=5&filter=visibility:public&order=name&page=2&fields=name&include=count.posts',
      '/tiers/?limit=all&include=monthly_price',
      '/newsletters/?limit=5&filter=status:active&order=sort_order&page=1&fields=name',
      '/users/?limit=5&include=roles',
      '/slugs/post/hello/',
      '/site/',
    ]) {
      expect(check(path).problem, path).toBeUndefined();
    }
  });

  it('takes no parameters on a delete, names no includes for it, and doesn’t check its body', () => {
    const id = '5ddc9141c35e7700383b2937';
    for (const path of [`/posts/${id}/?include=tags`, `/tags/${id}/?include=count.posts`]) {
      expect(check(path, 'DELETE').problem, path).toBe('blocked');
    }
    const result = check(`/posts/${id}/`, 'DELETE', root, '{"posts":[{"codeinjection_head":"x"}]}');
    expect(result.problem).toBeUndefined();
    expect(result.problem === undefined && result.url.search).toBe('');
  });

  // How a post performed is `post:readStats`'s, so reads and writes of posts and pages can
  // include it, or sort by it, only with that scope.
  it('includes or sorts by how posts performed only with post:readStats', () => {
    const id = '5ddc9141c35e7700383b2937';
    const cases = [
      ['GET', '/posts/?include=email', 'including email'],
      ['GET', '/posts/?include=tags,count.clicks', 'including count.clicks'],
      ['GET', '/posts/?include=tags&include=sentiment', 'including sentiment'],
      ['GET', `/posts/${id}/?include=tags, count.signups`, 'including count.signups'],
      ['GET', '/pages/?include=count.paid_conversions', 'including count.paid_conversions'],
      [
        'GET',
        '/posts/slug/hello/?include=count.positive_feedback',
        'including count.positive_feedback',
      ],
      ['PUT', `/posts/${id}/?include=email`, 'including email'],
      ['POST', '/pages/?include=count.signups', 'including count.signups'],
      ['GET', '/posts/?order=sentiment%20desc', 'ordering by sentiment'],
      ['GET', '/posts/?order=title%20asc,%20email.open_rate%20desc', 'ordering by email.open_rate'],
    ] as const;
    const withStats = new Set([...APPROVED, 'post:readStats' as const]);
    for (const [method, path, what] of cases) {
      const pathname = path.split('?')[0];
      expect(check(path, method), `${method} ${path}`).toEqual({
        problem: 'blocked',
        pathname,
        detail: `This app wasn't approved for post:readStats, which ${what} needs`,
      });
      expect(check(path, method, root, undefined, withStats).problem, path).toBeUndefined();
    }
    expect(
      check('/posts/?include=tags,authors,tiers&order=published_at%20desc&limit=5').problem,
    ).toBeUndefined();
    expect(check(`/posts/${id}/?include=post_revisions&formats=lexical`).problem).toBe(undefined);
    expect(check('/posts/?include=members').problem).toBe('blocked');
    // Ghost skips an empty part, so it needs nothing.
    expect(check('/posts/?include=tags,,authors').problem).toBeUndefined();
    expect(check('/posts/?debug=true').problem).toBe('blocked');
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
    for (const path of ['/tags/?filter=@evil.example', '/tags/#@evil.example']) {
      expect(new URL(resolved(path)!).origin, path).toBe('https://site.example');
    }
  });
});
