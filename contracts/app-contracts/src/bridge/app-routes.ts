import type { AppPermissionKey } from '../scopes.ts';
import type { FetchMethod } from './rules.ts';
import type { ServerGapName } from './server-gaps.ts';

type RouteGaps = Readonly<Record<string, readonly ServerGapName[]>>;

const POST_WRITE = [
  'emailAndHtmlSource',
  'rerenderOrConvert',
  'scriptInContent',
  'postFields',
] as const;
const PAGE_WRITE = [
  'emailAndHtmlSource',
  'rerenderOrConvert',
  'scriptInContent',
  'pageFields',
] as const;

/**
 * Every Admin API route each scope opens to an app, with the server gaps the bridge covers on
 * it. This is the reviewed list of what approving a scope gives an app.
 *
 * On Ghost's server a scope opens exactly the routes whose permission check is the scope's key,
 * and a test in Ghost holds this list to those routes in both directions, so it can't drift from
 * what the server does. A change here means an app with that scope can call
 * something new, or can no longer call something: a route added under a key apps can hold, a
 * route moved to another key, or a key added to the scope registry. Before making it, check
 * that every app approved for the scope should reach the route, and what the route returns or
 * changes. A route apps shouldn't reach gets a permission key of its own in Ghost, as the stats
 * routes and bulk delete did.
 *
 * Opening a route to apps is one edit here, and it has to say what the bridge covers on the
 * route until the server does: the gaps in `SERVER_GAPS` that apply, or none. A route with none
 * is sent as the app wrote it.
 *
 * The bridge still sends only the routes listed here, and the site's public details, and only
 * for an installation approved for the scope a route is listed under (`scopesOpening`).
 *
 * Routes are written as `METHOD /path`, in path segments, as Ghost's router mounts them. A
 * `:name` matches any one segment. A route matches with or without a trailing `/`, and its
 * fixed segments in any case, as Ghost's router reads them.
 */
export const APP_ROUTES = {
  'post:browse': {
    'GET /posts': ['postFields'],
    'GET /pages': ['pageFields'],
    'GET /search-index/posts': [],
    'GET /search-index/pages': [],
  },
  'post:read': {
    'GET /posts/:id': ['postFields'],
    'GET /posts/slug/:slug': ['postFields'],
    'GET /pages/:id': ['pageFields'],
    'GET /pages/slug/:slug': ['pageFields'],
  },
  'post:add': {
    'POST /posts': POST_WRITE,
    'POST /pages': PAGE_WRITE,
    'POST /posts/:id/copy': ['copy'],
    'POST /pages/:id/copy': ['copy'],
  },
  'post:edit': {
    'PUT /posts/:id': POST_WRITE,
    'PUT /pages/:id': PAGE_WRITE,
    'PUT /posts/bulk': ['bulkEdit'],
    'PUT /pages/bulk': ['bulkEdit'],
  },
  'post:destroy': {
    'DELETE /posts/:id': [],
    'DELETE /pages/:id': [],
  },
  'post:readStats': {
    'GET /stats/posts/:id/stats': [],
    'GET /feedback/:id': [],
    'POST /stats/posts-visitor-counts': [],
    'POST /stats/posts-member-counts': [],
  },
  'tag:browse': {
    'GET /tags': [],
    'GET /search-index/tags': [],
  },
  'tag:read': {
    'GET /tags/:id': [],
    'GET /tags/slug/:slug': [],
  },
  'tag:add': { 'POST /tags': ['scriptInContent'] },
  'tag:edit': { 'PUT /tags/:id': ['scriptInContent'] },
  'tag:destroy': { 'DELETE /tags/:id': [] },
  'product:browse': { 'GET /tiers': [] },
  'newsletter:browse': { 'GET /newsletters': ['newsletterFields'] },
  'slug:generate': {
    'GET /slugs/:type/:name': [],
    'GET /slugs/:type/:name/:id': [],
  },
  'user:browse': {
    'GET /users': [],
    'GET /search-index/users': [],
  },
} as const satisfies Record<AppPermissionKey, RouteGaps>;

interface Route {
  readonly scope: AppPermissionKey;
  readonly method: string;
  /** A fixed segment in lowercase, or `null` for a parameter. */
  readonly segments: ReadonlyArray<string | null>;
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
        .map((segment) => (segment.startsWith(':') ? null : segment.toLowerCase())),
    };
  });

/**
 * The routes a request to an Admin API path with this method matches. Takes a pathname relative
 * to the Admin API root, such as `/posts/`, without the query.
 *
 * A path can match more than one route, as `/posts/bulk` matches `/posts/:id` too, and which of
 * them Ghost's router picks depends on the order it mounts them in. So every match counts, and
 * no ordering here can leave a gap open.
 */
function matching(pathname: string, method: FetchMethod): Route[] {
  const segments = pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
  return ROUTES.filter(
    (route) =>
      route.method === method &&
      route.segments.length === segments.length &&
      route.segments.every(
        (fixed, index) => fixed === null || fixed === (segments[index] as string).toLowerCase(),
      ),
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
