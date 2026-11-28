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
 * Ghost's server is the gate: a scope opens exactly the routes whose permission check is the
 * scope's key, and a test in Ghost holds this list to those routes in both directions, so it
 * can't drift from what the server does. A change here means an app with that scope can call
 * something new, or can no longer call something: a route added under a key apps can hold, a
 * route moved to another key, or a key added to the scope registry. Before making it, check
 * that every app approved for the scope should reach the route, and what the route returns or
 * changes. A route apps shouldn't reach gets a permission key of its own in Ghost, as the stats
 * routes and bulk delete did.
 *
 * Opening a route to apps is one edit here, and it has to say what the bridge covers on the
 * route until the server does: the gaps in `SERVER_GAPS` that apply, or none. A route with none
 * is sent as the app wrote it. A route that isn't here is sent on too: the server refuses it.
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
  readonly method: string;
  /** A fixed segment in lowercase, or `null` for a parameter. */
  readonly segments: ReadonlyArray<string | null>;
  readonly gaps: readonly ServerGapName[];
}

const ROUTES: readonly Route[] = Object.values<RouteGaps>(APP_ROUTES)
  .flatMap((routes) => Object.entries(routes))
  .map(([route, gaps]) => {
    const [method = '', path = ''] = route.split(' ');
    return {
      method,
      gaps,
      segments: path
        .split('/')
        .filter(Boolean)
        .map((segment) => (segment.startsWith(':') ? null : segment.toLowerCase())),
    };
  });

/**
 * The gaps the bridge covers on a request to an Admin API path with this method, without
 * repeats. Takes a pathname relative to the Admin API root, such as `/posts/`, without the
 * query.
 *
 * A path can match more than one route, as `/posts/bulk` matches `/posts/:id` too, and which of
 * them Ghost's router picks depends on the order it mounts them in. Every match's gaps apply, so
 * no ordering here can leave a gap open.
 */
export function serverGapsFor(pathname: string, method: FetchMethod): ServerGapName[] {
  const segments = pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
  const matched = ROUTES.filter(
    (route) =>
      route.method === method &&
      route.segments.length === segments.length &&
      route.segments.every(
        (fixed, index) => fixed === null || fixed === (segments[index] as string).toLowerCase(),
      ),
  );
  return [...new Set(matched.flatMap((route) => route.gaps))];
}
