import { describe, expect, it } from 'vitest';

import { APP_ROUTES, serverGapsFor } from '../../src/bridge/app-routes.ts';
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

  it('names only gaps there are, and uses every one', () => {
    const named = new Set(Object.values(ROUTES).flatMap((opened) => Object.values(opened).flat()));
    expect([...named].sort()).toEqual(Object.keys(SERVER_GAPS).sort());
  });
});

describe('finding the gaps on a request', () => {
  const gaps = (method: FetchMethod, path: string) => serverGapsFor(path, method);

  it('finds a route’s gaps, for its method only', () => {
    expect(gaps('GET', '/posts/')).toEqual(['postFields']);
    expect(gaps('GET', `/pages/${ID}/`)).toEqual(['pageFields']);
    expect(gaps('GET', '/posts/slug/welcome/')).toEqual(['postFields']);
    expect(gaps('POST', '/posts/')).toEqual([
      'emailAndHtmlSource',
      'rerenderOrConvert',
      'scriptInContent',
      'postFields',
    ]);
    expect(gaps('PUT', `/pages/${ID}/`)).toEqual([
      'emailAndHtmlSource',
      'rerenderOrConvert',
      'scriptInContent',
      'pageFields',
    ]);
    expect(gaps('PUT', `/tags/${ID}/`)).toEqual(['scriptInContent']);
    expect(gaps('GET', '/newsletters/')).toEqual(['newsletterFields']);
    expect(gaps('DELETE', `/posts/${ID}/`)).toEqual([]);
    expect(gaps('GET', '/tags/')).toEqual([]);
  });

  it('finds none on a route it doesn’t name, which the server decides', () => {
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

  // Ghost's router reads `:id` as any one segment, so a gap must cover them all.
  it('matches a parameter to any one segment, as Ghost’s router does', () => {
    for (const id of [ID, ID.toUpperCase(), '1', 'me', 'caf%C3%A9', '%2e']) {
      expect(gaps('PUT', `/posts/${id}/`), id).toContain('emailAndHtmlSource');
    }
    expect(gaps('PUT', '/posts/a/b/')).toEqual([]);
  });

  it('applies the gaps of every route a path matches, whichever Ghost’s router picks', () => {
    expect(gaps('PUT', '/posts/bulk/')).toEqual([
      'emailAndHtmlSource',
      'rerenderOrConvert',
      'scriptInContent',
      'postFields',
      'bulkEdit',
    ]);
    expect(gaps('PUT', '/pages/BULK')).toContain('bulkEdit');
  });

  it('reads paths the way the router does: fixed segments in any case, with or without a trailing slash', () => {
    for (const path of ['/posts', '/posts/', '/POSTS/', '/Posts']) {
      expect(gaps('POST', path), path).toContain('scriptInContent');
    }
    expect(gaps('GET', `/Posts/SLUG/welcome`)).toEqual(['postFields']);
  });
});
