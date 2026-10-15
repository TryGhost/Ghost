import { describe, expect, it } from 'vitest';

import { ADMIN_API_ALLOWLIST, findAllowedAdminApiRoute } from '../../src/bridge/allowlist.ts';
import { FETCH_METHODS, type FetchMethod } from '../../src/bridge/rules.ts';

const ID = '5ddc9141c35e7700383b2937';

const allowed = (method: FetchMethod, path: string) =>
  findAllowedAdminApiRoute(path, method)?.route;

describe('the Admin API allowlist', () => {
  it('groups its routes under scope names, each with a description', () => {
    expect(ADMIN_API_ALLOWLIST.map((scope) => scope.name)).toEqual([
      'posts:read',
      'posts:write',
      'pages:read',
      'pages:write',
      'tags:read',
      'tags:write',
      'users:read',
      'tiers:read',
      'newsletters:read',
      'slugs:read',
    ]);
    for (const scope of ADMIN_API_ALLOWLIST) {
      expect(scope.name).toMatch(/^[a-z]+:(?:read|write)$/);
      expect(scope.description).not.toBe('');
      expect(scope.routes.length).toBeGreaterThan(0);
      for (const route of scope.routes) {
        const [method, path] = route.split(' ');
        expect(FETCH_METHODS, route).toContain(method);
        expect(path, route).toMatch(/^(?:\/(?:[a-z_-]+|:[a-z]+))+$/);
        // Reads are only GETs, and writes never are.
        expect(method === 'GET', route).toBe(scope.name.endsWith(':read'));
      }
    }
  });

  it('allows the routes it lists, for their method only', () => {
    for (const [method, path, route] of [
      ['GET', '/posts/', 'GET /posts'],
      ['GET', '/posts/?limit=5', 'GET /posts'],
      ['GET', `/posts/${ID}/`, 'GET /posts/:id'],
      ['GET', '/posts/slug/welcome/', 'GET /posts/slug/:slug'],
      ['POST', '/posts/', 'POST /posts'],
      ['PUT', `/posts/${ID}/`, 'PUT /posts/:id'],
      ['DELETE', `/posts/${ID}/`, 'DELETE /posts/:id'],
      ['GET', '/pages/', 'GET /pages'],
      ['PUT', `/pages/${ID}`, 'PUT /pages/:id'],
      ['GET', '/tags/slug/news/', 'GET /tags/slug/:slug'],
      ['POST', '/tags/', 'POST /tags'],
      ['DELETE', `/tags/${ID}/`, 'DELETE /tags/:id'],
      ['GET', '/users/', 'GET /users'],
      ['GET', '/tiers/', 'GET /tiers'],
      ['GET', '/newsletters/', 'GET /newsletters'],
      ['GET', '/search-index/posts/', 'GET /search-index/posts'],
      ['GET', '/search-index/pages', 'GET /search-index/pages'],
      ['GET', '/search-index/tags/', 'GET /search-index/tags'],
      ['GET', '/slugs/post/My%20title/', 'GET /slugs/:type/:name'],
      ['GET', `/slugs/tag/news/${ID}/`, 'GET /slugs/:type/:name/:id'],
    ] as const) {
      expect(allowed(method, path.split('?')[0] as string), `${method} ${path}`).toBe(route);
    }
  });

  it('refuses everything else', () => {
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
      expect(allowed(method, path), `${method} ${path}`).toBeUndefined();
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
      expect(allowed('GET', `/posts/${id}/`), id).toBeUndefined();
      expect(allowed('PUT', `/posts/${id}/`), id).toBeUndefined();
    }
  });

  it('matches a slug to exactly one segment', () => {
    expect(allowed('GET', '/posts/slug/')).toBeUndefined();
    expect(allowed('GET', '/posts/slug/a/b/')).toBeUndefined();
    expect(allowed('GET', '/posts/slug/a%2Fb/')).toBeUndefined();
  });

  it('reads paths the way the router does: fixed segments in any case, with or without a trailing slash', () => {
    for (const path of ['/posts', '/posts/', '/POSTS/', '/Posts']) {
      expect(allowed('GET', path), path).toBe('GET /posts');
    }
    expect(allowed('GET', `/Posts/${ID}`)).toBe('GET /posts/:id');
  });

  it('matches fixed segments only as written out, as Ghost’s router does', () => {
    // The router matches `/%70osts/` as it arrives, so it isn't the posts route.
    expect(allowed('GET', '/%70osts/')).toBeUndefined();
    // Read as the slug route here, it would reach another route in Ghost.
    expect(allowed('GET', '/posts/sl%75g/welcome/')).toBeUndefined();
    expect(allowed('GET', `/posts/%35${ID.slice(1)}/`)).toBeUndefined();
    // A parameter is decoded, as the router decodes it.
    expect(allowed('GET', '/posts/slug/caf%C3%A9/')).toBe('GET /posts/slug/:slug');
    expect(allowed('GET', '/slugs/post/My%20title/')).toBe('GET /slugs/:type/:name');
  });

  it('matches nothing for a path with an empty segment', () => {
    for (const path of [`//posts/${ID}/`, `/posts//${ID}/`, '/posts//', '/tags/slug//', '/']) {
      expect(allowed('GET', path), path).toBeUndefined();
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
      expect(allowed('GET', path), path).toBeUndefined();
    }
  });
});
