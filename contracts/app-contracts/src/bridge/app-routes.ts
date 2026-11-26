import type { AppPermissionKey } from '../scopes.ts';
import type { FetchMethod } from './rules.ts';
import type { ServerGapName } from './server-gaps.ts';

type RouteGaps = Readonly<Record<string, readonly ServerGapName[]>>;

const POST_WRITE = ['postWriteParameters', 'postFields', 'scriptInContent'] as const;
const PAGE_WRITE = ['postWriteParameters', 'pageFields', 'scriptInContent'] as const;

/**
 * Every Admin API route each scope opens to an app, with the server gaps the bridge covers on
 * it. This is the reviewed list of what approving a scope gives an app.
 *
 * On Ghost's server a scope opens the routes whose permission check is the scope's key, and a
 * test in Ghost holds this list to those routes, naming the few the server opens that the bridge
 * doesn't send yet, so it can't drift from what the server does. A change here means an app with
 * that scope can call something new, or can no longer call something: a route added under a key
 * apps can hold, a route moved to another key, or a key added to the scope registry. Before
 * making it, check that every app approved for the scope should reach the route, and what the
 * route returns or changes. A route apps shouldn't reach gets a permission key of its own in
 * Ghost, as the stats routes and bulk delete did.
 *
 * Opening a route to apps is one edit here, and it has to say what the bridge covers on the
 * route until the server does: the gaps in `SERVER_GAPS` that apply, or none. A route with none
 * is sent as the app wrote it.
 *
 * The bridge sends only the routes listed here, and the site's public details, and only for an
 * installation approved for the scope a route is listed under (`scopesOpening`).
 *
 * Routes are written as `METHOD /path`, in path segments, as Ghost's router mounts them. `:id`
 * matches only an object ID: 24 lowercase hexadecimal characters. Any other `:name` matches any
 * one segment, such as a slug. A route matches with or without a trailing `/`, and its fixed
 * segments in any case, as Ghost's router reads them. A fixed segment must be written out, not
 * escaped: Ghost's router matches the path as it arrives, so `/posts/sl%75g/…` doesn't reach the
 * slug route.
 */
export const APP_ROUTES = {
  'post:browse': {
    'GET /posts': ['postListParameters', 'postFields'],
    'GET /pages': ['postListParameters', 'pageFields'],
    'GET /search-index/posts': ['postListParameters', 'searchIndexFields'],
    'GET /search-index/pages': ['postListParameters', 'searchIndexFields'],
  },
  'post:read': {
    'GET /posts/:id': ['postReadParameters', 'postFields'],
    'GET /posts/slug/:slug': ['postReadParameters', 'postFields'],
    'GET /pages/:id': ['postReadParameters', 'pageFields'],
    'GET /pages/slug/:slug': ['postReadParameters', 'pageFields'],
  },
  'post:add': {
    'POST /posts': POST_WRITE,
    'POST /pages': PAGE_WRITE,
  },
  'post:edit': {
    'PUT /posts/:id': POST_WRITE,
    'PUT /pages/:id': PAGE_WRITE,
  },
  'post:destroy': {
    'DELETE /posts/:id': ['noParameters'],
    'DELETE /pages/:id': ['noParameters'],
  },
  // How a post performed comes only through the includes and sorts of reading posts, for now
  'post:readStats': {},
  'tag:browse': {
    'GET /tags': ['listParameters'],
    'GET /search-index/tags': ['listParameters'],
  },
  'tag:read': {
    'GET /tags/:id': ['tagReadParameters'],
    'GET /tags/slug/:slug': ['tagReadParameters'],
  },
  'tag:add': { 'POST /tags': ['tagWriteParameters', 'scriptInContent'] },
  'tag:edit': { 'PUT /tags/:id': ['tagWriteParameters', 'scriptInContent'] },
  'tag:destroy': { 'DELETE /tags/:id': ['noParameters'] },
  'product:browse': { 'GET /tiers': ['listParameters'] },
  'newsletter:browse': { 'GET /newsletters': ['listParameters', 'newsletterFields'] },
  'slug:generate': {
    'GET /slugs/:type/:name': ['noParameters'],
    'GET /slugs/:type/:name/:id': ['noParameters'],
  },
  'user:browse': { 'GET /users': ['listParameters'] },
} as const satisfies Record<AppPermissionKey, RouteGaps>;

type Segment =
  | { readonly kind: 'fixed'; readonly value: string }
  | { readonly kind: 'id' }
  | { readonly kind: 'any' };

interface Route {
  readonly scope: AppPermissionKey;
  readonly method: string;
  readonly segments: readonly Segment[];
  readonly gaps: readonly ServerGapName[];
}

const ROUTES: readonly Route[] = (Object.entries(APP_ROUTES) as [AppPermissionKey, RouteGaps][])
  .flatMap(([scope, routes]) => Object.entries(routes).map((entry) => [scope, ...entry] as const))
  .map(([scope, route, gaps]) => {
    const [method = '', path = ''] = route.split(' ');
    return {
      scope,
      method,
      gaps,
      segments: path
        .split('/')
        .filter(Boolean)
        .map((segment): Segment => {
          if (segment === ':id') {
            return { kind: 'id' };
          }
          return segment.startsWith(':')
            ? { kind: 'any' }
            : { kind: 'fixed', value: segment.toLowerCase() };
        }),
    };
  });

const OBJECT_ID = /^[0-9a-f]{24}$/;
const OPAQUE_SEGMENT = /^\.{1,2}$/;

// A parameter is decoded before it's checked, as Ghost's router decodes it, and mustn't decode to
// `.`, `..` or a separator; a fixed segment isn't decoded, as the router matches it escaped.
function matchesSegment(part: Segment, segment: string): boolean {
  if (part.kind === 'fixed') {
    return part.value === segment.toLowerCase();
  }
  if (part.kind === 'id') {
    return OBJECT_ID.test(segment);
  }
  try {
    const decoded = decodeURIComponent(segment);
    return !OPAQUE_SEGMENT.test(decoded) && !/[/\\]/.test(decoded);
  } catch {
    return false;
  }
}

/**
 * The routes a request to an Admin API path with this method matches. Takes a pathname relative
 * to the Admin API root, such as `/posts/`, without the query.
 *
 * A path matches nothing if it has an empty segment, other than the trailing `/`, or a segment
 * that is `.` or `..`, written out or escaped, because where such a path leads depends on which
 * parser reads it. Should a path match more than one route, every match counts, so no ordering
 * here can leave a gap open.
 */
function matching(pathname: string, method: FetchMethod): Route[] {
  if (!pathname.startsWith('/')) {
    return [];
  }
  const segments = pathname.slice(1).replace(/\/$/, '').split('/');
  if (segments.some((segment) => segment === '' || OPAQUE_SEGMENT.test(segment))) {
    return [];
  }
  return ROUTES.filter(
    (route) =>
      route.method === method &&
      route.segments.length === segments.length &&
      route.segments.every((part, index) => matchesSegment(part, segments[index] as string)),
  );
}

/**
 * The gaps the bridge covers on a request to an Admin API path with this method, without
 * repeats: those of every route the path matches.
 */
export function serverGapsFor(pathname: string, method: FetchMethod): ServerGapName[] {
  return [...new Set(matching(pathname, method).flatMap((route) => route.gaps))];
}

/**
 * The scopes the routes a request matches are listed under, without repeats, or none when it
 * matches no route here. The bridge sends a request only when it matches a route and the
 * installation was approved for every one of these.
 */
export function scopesOpening(pathname: string, method: FetchMethod): AppPermissionKey[] {
  return [...new Set(matching(pathname, method).map((route) => route.scope))];
}
