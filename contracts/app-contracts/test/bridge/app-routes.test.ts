import { describe, expect, it } from 'vitest';

import { APP_ROUTES, scopesOpening, serverGapsFor } from '../../src/bridge/app-routes.ts';
import { FETCH_METHODS, type FetchMethod } from '../../src/bridge/rules.ts';
import { SERVER_GAPS } from '../../src/bridge/server-gaps.ts';
import { APP_PERMISSION_KEYS } from '../../src/scopes.ts';

const ID = '5ddc9141c35e7700383b2937';

const ROUTES: Record<string, Record<string, readonly string[]>> = APP_ROUTES;

// That these are the routes Ghost's server opens under each scope is a test in Ghost.
describe('the routes each scope opens to an app', () => {
  it('lists every scope in the registry, and no other', () => {
    expect(Object.keys(ROUTES).sort()).toEqual([...APP_PERMISSION_KEYS].sort());
  });

  it('writes each route as a method and a path, as Ghost’s router mounts them, once', () => {
    const routes = Object.values(ROUTES).flatMap((opened) => Object.keys(opened));
    for (const route of routes) {
      const [method, path] = route.split(' ');
      expect(FETCH_METHODS, route).toContain(method);
      expect(path, route).toMatch(/^(?:\/(?:[a-z_-]+|:[a-z]+))+$/);
    }
    expect(new Set(routes).size).toBe(routes.length);
  });

  // Otherwise a scope could be declared and approved, and grant nothing.
  it('opens something for every scope in the registry: a route, an include or a sort', () => {
    const opened = new Set([
      ...Object.entries(ROUTES).flatMap(([scope, routes]) =>
        Object.keys(routes).length > 0 ? [scope] : [],
      ),
      ...[SERVER_GAPS.postFields, SERVER_GAPS.pageFields, SERVER_GAPS.newsletterFields].flatMap(
        (gap) => Object.values(gap.fieldScopes),
      ),
    ]);
    for (const name of APP_PERMISSION_KEYS) {
      expect(opened.has(name), name).toBe(true);
    }
  });

  it('keeps each scope to the methods its action allows', () => {
    const METHOD_OF: Record<string, FetchMethod> = {
      browse: 'GET',
      read: 'GET',
      generate: 'GET',
      add: 'POST',
      edit: 'PUT',
      destroy: 'DELETE',
    };
    for (const [scope, routes] of Object.entries(ROUTES)) {
      for (const route of Object.keys(routes)) {
        expect(route.split(' ')[0], route).toBe(METHOD_OF[scope.split(':')[1] as string]);
      }
    }
  });

  it('names only gaps there are, and uses every one', () => {
    const named = new Set(Object.values(ROUTES).flatMap((opened) => Object.values(opened).flat()));
    expect([...named].sort()).toEqual(Object.keys(SERVER_GAPS).sort());
  });
});

describe('finding the gaps on a request', () => {
  const gaps = (method: FetchMethod, path: string) => serverGapsFor(path, method);

  it('finds a route’s gaps, for its method only', () => {
    expect(gaps('GET', '/posts/')).toEqual(['postListParameters', 'postFields']);
    expect(gaps('GET', `/pages/${ID}/`)).toEqual(['postReadParameters', 'pageFields']);
    expect(gaps('GET', '/posts/slug/welcome/')).toEqual(['postReadParameters', 'postFields']);
    expect(gaps('GET', '/search-index/posts/')).toEqual([
      'postListParameters',
      'searchIndexFields',
    ]);
    expect(gaps('POST', '/posts/')).toEqual([
      'postWriteParameters',
      'postFields',
      'scriptInContent',
    ]);
    expect(gaps('PUT', `/pages/${ID}/`)).toEqual([
      'postWriteParameters',
      'pageFields',
      'scriptInContent',
    ]);
    expect(gaps('PUT', `/tags/${ID}/`)).toEqual(['tagWriteParameters', 'scriptInContent']);
    expect(gaps('GET', '/newsletters/')).toEqual(['listParameters', 'newsletterFields']);
    expect(gaps('DELETE', `/posts/${ID}/`)).toEqual(['noParameters']);
    expect(gaps('GET', '/tags/')).toEqual(['listParameters']);
  });

  it('finds none on a route it doesn’t name', () => {
    for (const [method, path] of [
      ['GET', '/db/'],
      ['DELETE', '/posts/'],
      ['GET', '/settings/'],
      ['GET', '/site/'],
      ['GET', '/'],
    ] as const) {
      expect(gaps(method, path), `${method} ${path}`).toEqual([]);
    }
  });

  it('reads paths the way the router does: fixed segments in any case, with or without a trailing slash', () => {
    for (const path of ['/posts', '/posts/', '/POSTS/', '/Posts']) {
      expect(gaps('POST', path), path).toContain('scriptInContent');
    }
    expect(gaps('GET', `/Posts/SLUG/welcome`)).toEqual(['postReadParameters', 'postFields']);
  });
});

describe('finding the scopes a request needs', () => {
  const opening = (method: FetchMethod, path: string) => scopesOpening(path, method);

  it('names the scope a route is listed under, for its method only', () => {
    for (const [method, path, scope] of [
      ['GET', '/posts/', 'post:browse'],
      ['GET', '/posts/?limit=5', 'post:browse'],
      ['GET', `/posts/${ID}/`, 'post:read'],
      ['GET', '/posts/slug/welcome/', 'post:read'],
      ['POST', '/posts/', 'post:add'],
      ['PUT', `/posts/${ID}/`, 'post:edit'],
      ['DELETE', `/posts/${ID}/`, 'post:destroy'],
      ['GET', '/pages/', 'post:browse'],
      ['PUT', `/pages/${ID}`, 'post:edit'],
      ['GET', '/tags/slug/news/', 'tag:read'],
      ['POST', '/tags/', 'tag:add'],
      ['DELETE', `/tags/${ID}/`, 'tag:destroy'],
      ['GET', '/users/', 'user:browse'],
      ['GET', '/tiers/', 'product:browse'],
      ['GET', '/newsletters/', 'newsletter:browse'],
      ['GET', '/search-index/posts/', 'post:browse'],
      ['GET', '/search-index/pages', 'post:browse'],
      ['GET', '/search-index/tags/', 'tag:browse'],
      ['GET', '/slugs/post/My%20title/', 'slug:generate'],
      ['GET', `/slugs/tag/news/${ID}/`, 'slug:generate'],
    ] as const) {
      expect(opening(method, path.split('?')[0] as string), `${method} ${path}`).toEqual([scope]);
    }
  });

  it('names none for a route that isn’t listed', () => {
    for (const [method, path] of [
      ['DELETE', '/posts/'],
      ['PUT', '/posts/bulk/'],
      ['GET', '/posts/export/'],
      ['POST', `/posts/${ID}/copy/`],
      ['GET', `/posts/${ID}/gift_links/`],
      ['POST', '/posts/upload/'],
      ['GET', `/users/${ID}/`],
      ['GET', `/users/${ID}/token/`],
      ['GET', '/users/me/'],
      ['GET', '/users/slug/jamie/'],
      ['PUT', '/users/password/'],
      ['GET', `/tiers/${ID}/`],
      ['POST', '/tiers/'],
      ['GET', `/newsletters/${ID}/`],
      ['GET', `/stats/posts/${ID}/stats/`],
      ['GET', '/site/'],
      ['PUT', '/site/'],
      ['GET', '/site/extra/'],
      ['GET', '/search-index/users/'],
      ['GET', '/slugs/post/'],
      ['GET', '/members/'],
      ['GET', '/settings/'],
      ['GET', '/db/'],
      ['GET', '/integrations/'],
      ['GET', '/apps/installations/'],
      ['GET', '/'],
      ['GET', ''],
    ] as const) {
      expect(opening(method, path), `${method} ${path}`).toEqual([]);
    }
  });

  it('matches :id only to an object ID: 24 lowercase hexadecimal characters', () => {
    for (const id of [
      ID.toUpperCase(),
      ID.slice(1),
      `${ID}0`,
      'export',
      'bulk',
      '1',
      'me',
      `${ID.slice(0, 23)}g`,
    ]) {
      expect(opening('GET', `/posts/${id}/`), id).toEqual([]);
      expect(opening('PUT', `/posts/${id}/`), id).toEqual([]);
    }
  });

  it('matches a slug to exactly one segment', () => {
    expect(opening('GET', '/posts/slug/')).toEqual([]);
    expect(opening('GET', '/posts/slug/a/b/')).toEqual([]);
    expect(opening('GET', '/posts/slug/a%2Fb/')).toEqual([]);
  });

  it('reads paths the way the router does: fixed segments in any case, with or without a trailing slash', () => {
    for (const path of ['/posts', '/posts/', '/POSTS/', '/Posts']) {
      expect(opening('GET', path), path).toEqual(['post:browse']);
    }
    expect(opening('GET', `/Posts/${ID}`)).toEqual(['post:read']);
  });

  it('matches fixed segments only as written out, as Ghost’s router does', () => {
    // The router matches `/%70osts/` as it arrives, so it isn't the posts route.
    expect(opening('GET', '/%70osts/')).toEqual([]);
    // Read as the slug route here, it would reach another route in Ghost.
    expect(opening('GET', '/posts/sl%75g/welcome/')).toEqual([]);
    expect(opening('GET', `/posts/%35${ID.slice(1)}/`)).toEqual([]);
    // A parameter is decoded, as the router decodes it.
    expect(opening('GET', '/posts/slug/caf%C3%A9/')).toEqual(['post:read']);
    expect(opening('GET', '/slugs/post/My%20title/')).toEqual(['slug:generate']);
  });

  it('matches nothing for a path with an empty segment', () => {
    for (const path of [`//posts/${ID}/`, `/posts//${ID}/`, '/posts//', '/tags/slug//', '/']) {
      expect(opening('GET', path), path).toEqual([]);
    }
  });

  it('matches nothing for a path whose destination depends on which parser reads it', () => {
    for (const path of [
      '/posts/../tags/',
      '/posts/%2e%2e/tags/',
      '/posts/./',
      '/tags/..',
      '/posts/slug/%',
      '/posts/slug/%zz/',
      '/posts/slug/%E0%A4%A/',
      '/posts/slug/%2e%2e/',
      '/posts/slug/./',
    ]) {
      expect(opening('GET', path), path).toEqual([]);
    }
  });
});
