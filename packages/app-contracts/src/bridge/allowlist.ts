import type { FetchMethod } from './rules.ts';

/**
 * The Admin API routes apps can reach through the fetch escape hatch. Everything else is
 * refused.
 *
 * Apps call the Admin API with the staff user's own session. This list stands in for an
 * app-scoped token with permissions, which comes with Permissions and auth. The routes are
 * grouped under the scope names that work will use, so it can take them over as they are.
 *
 * What's allowed, and why:
 *
 * - Posts, pages and tags: list, read, create, edit and delete one at a time. Apps exist to
 *   work with the publisher's content. Bulk edits, bulk deletes, exports, copies, uploads and
 *   gift links are left out.
 * - Staff users, tiers and newsletters: list only, for showing an author, an access level or a
 *   newsletter. Members, settings, integrations and everything that hands out lasting access
 *   are left out.
 * - The search index of posts, pages and tags, and slug generation, which Admin's own editor
 *   uses to pick a slug before saving.
 *
 * A post or page write refuses the `newsletter`, `email_segment` and `source` parameters, so it
 * can't send the post as email or turn HTML into the post as it is.
 *
 * What the security review before opening apps to outside developers (BER-3992) must look at
 * in this set:
 *
 * - Publishing and unpublishing: a write can change a post's status, schedule it, or change who
 *   can read it (`visibility`, `tiers`), with no confirmation from the publisher. Publishing a
 *   scheduled post that already has a newsletter sends its email then, with no parameter.
 * - Staff emails: `GET /users/` returns every staff user's email.
 * - Script in what a post, page or tag write sends.
 *
 * Routes are written as `METHOD /path`, in path segments. `:id` matches only an object ID: 24
 * lowercase hexadecimal characters. Any other `:name` matches any one segment, such as a slug.
 * A route matches with or without a trailing `/`, and its fixed segments in any case, as Ghost's
 * router reads them.
 */

export interface AdminApiScope {
  /** The scope's name, as Permissions and auth will name it, such as `posts:write`. */
  readonly name: string;
  /** What the scope lets an app do. */
  readonly description: string;
  /** Each route as `METHOD /path`, relative to the Admin API root. */
  readonly routes: readonly string[];
  /** Query parameters a request in this scope must not carry, whatever their value. */
  readonly refusedParameters?: readonly string[];
}

// `newsletter` and `email_segment` send a post as email, and `source=html` turns HTML into the
// post's content as it is.
const POST_WRITE_PARAMETERS = ['newsletter', 'email_segment', 'source'] as const;

export const ADMIN_API_ALLOWLIST: readonly AdminApiScope[] = [
  {
    name: 'posts:read',
    description: 'List and read posts, and search them.',
    routes: ['GET /posts', 'GET /posts/:id', 'GET /posts/slug/:slug', 'GET /search-index/posts'],
  },
  {
    name: 'posts:write',
    description: 'Create, edit and delete posts, one at a time, without email or script.',
    routes: ['POST /posts', 'PUT /posts/:id', 'DELETE /posts/:id'],
    refusedParameters: POST_WRITE_PARAMETERS,
  },
  {
    name: 'pages:read',
    description: 'List and read pages, and search them.',
    routes: ['GET /pages', 'GET /pages/:id', 'GET /pages/slug/:slug', 'GET /search-index/pages'],
  },
  {
    name: 'pages:write',
    description: 'Create, edit and delete pages, one at a time, without script.',
    routes: ['POST /pages', 'PUT /pages/:id', 'DELETE /pages/:id'],
    refusedParameters: POST_WRITE_PARAMETERS,
  },
  {
    name: 'tags:read',
    description: 'List and read tags, and search them.',
    routes: ['GET /tags', 'GET /tags/:id', 'GET /tags/slug/:slug', 'GET /search-index/tags'],
  },
  {
    name: 'tags:write',
    description: 'Create, edit and delete tags, one at a time, without script.',
    routes: ['POST /tags', 'PUT /tags/:id', 'DELETE /tags/:id'],
  },
  {
    name: 'users:read',
    description: 'List staff users, to show who wrote something.',
    routes: ['GET /users'],
  },
  {
    name: 'tiers:read',
    description: 'List tiers, to show who can read something.',
    routes: ['GET /tiers'],
  },
  {
    name: 'newsletters:read',
    description: 'List newsletters.',
    routes: ['GET /newsletters'],
  },
  {
    name: 'slugs:read',
    description: 'Ask Ghost for an unused slug, as the editor does before saving.',
    routes: ['GET /slugs/:type/:name', 'GET /slugs/:type/:name/:id'],
  },
];

const OBJECT_ID = /^[0-9a-f]{24}$/;

type Segment =
  | { readonly kind: 'fixed'; readonly value: string }
  | { readonly kind: 'id' }
  | { readonly kind: 'any' };

interface Route {
  readonly method: string;
  readonly segments: readonly Segment[];
  readonly route: string;
  readonly scope: AdminApiScope;
}

const ROUTES: readonly Route[] = ADMIN_API_ALLOWLIST.flatMap((scope) =>
  scope.routes.map((route) => {
    const [method = '', path = ''] = route.split(' ');
    return {
      method,
      route,
      scope,
      segments: path
        .split('/')
        .filter(Boolean)
        .map((segment): Segment => {
          if (segment === ':id') {
            return { kind: 'id' };
          }
          return segment.startsWith(':') ? { kind: 'any' } : { kind: 'fixed', value: segment };
        }),
    };
  }),
);

function matches(route: Route, segments: readonly string[]): boolean {
  return (
    route.segments.length === segments.length &&
    route.segments.every((part, index) => {
      const segment = segments[index] as string;
      if (part.kind === 'fixed') {
        return part.value === segment.toLowerCase();
      }
      return part.kind === 'any' || OBJECT_ID.test(segment);
    })
  );
}

/** The route an allowed request matched, and the scope it belongs to. */
export interface AllowedAdminApiRoute {
  /** The route as the allowlist writes it, such as `PUT /posts/:id`. */
  readonly route: string;
  readonly scope: AdminApiScope;
}

/**
 * Finds the allowlist route a request to an Admin API path with this method matches, or
 * returns `undefined` when apps can't make it. Takes a pathname relative to the Admin API root,
 * such as `/posts/`, without the query.
 *
 * A path is read after decoding percent-escapes, with empty segments dropped. A path that can't
 * be decoded, or that still contains `.` or `..` after decoding, matches nothing, because where
 * such a path leads depends on which parser reads it.
 */
export function findAllowedAdminApiRoute(
  pathname: string,
  method: FetchMethod,
): AllowedAdminApiRoute | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const segments = decoded.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return undefined;
  }
  const route = ROUTES.find((each) => each.method === method && matches(each, segments));
  return route && { route: route.route, scope: route.scope };
}
