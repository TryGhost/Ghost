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
 * Writes of posts, pages and tags are checked further, so an app can't ask Ghost to email a post
 * or put script on the site: a write may carry only the query parameters its scope lists, which
 * leaves out `newsletter`, `email_segment` and `source`, and `refusedContent` checks its body.
 * These checks are a stopgap for the private beta behind a flag. The security review re-reviews
 * them before anyone outside the team gets access (BER-3992), and Permissions and auth replaces
 * them with checks on the server.
 *
 * What the security review before opening apps to outside developers (BER-3992) must look at
 * in this set:
 *
 * - Publishing and unpublishing: a write can change a post's status, schedule it, or change who
 *   can read it (`visibility`, `tiers`), with no confirmation from the publisher. Publishing a
 *   scheduled post that already has a newsletter sends its email then, with no parameter.
 * - Staff emails: `GET /users/` returns every staff user's email.
 * - Anything in a post, page or tag that renders as HTML or script which `refusedContent` doesn't
 *   catch, and any Lexical node Ghost adds later.
 *
 * Routes are written as `METHOD /path`, in path segments. `:id` matches only an object ID: 24
 * lowercase hexadecimal characters. Any other `:name` matches any one segment, such as a slug.
 * A route matches with or without a trailing `/`, and its fixed segments in any case, as Ghost's
 * router reads them. A fixed segment must be written out, not escaped: Ghost's router matches
 * the path as it arrives, so `/posts/sl%75g/…` doesn't reach the slug route.
 */

export interface AdminApiScope {
  /** The scope's name, as Permissions and auth will name it, such as `posts:write`. */
  readonly name: string;
  /** What the scope lets an app do. */
  readonly description: string;
  /** Each route as `METHOD /path`, relative to the Admin API root. */
  readonly routes: readonly string[];
  /**
   * The only query parameters a request in this scope may carry, by exact name. Any other name
   * is refused, so a spelling Ghost's query parser reads differently, such as `[newsletter]`,
   * can't slip a parameter past the check. A scope without this list allows any parameter.
   */
  readonly allowedParameters?: readonly string[];
  /** The kind of content a write in this scope sends, which `refusedContent` checks. */
  readonly content?: 'posts' | 'pages' | 'tags';
}

// What Ghost reads on a post or page write, minus `newsletter` and `email_segment`, which send
// the post as email, `source=html`, which turns HTML into the post's content as it is, and the
// rest of what only Admin's editor needs.
const POST_WRITE_PARAMETERS = ['include', 'formats', 'save_revision'] as const;

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
    allowedParameters: POST_WRITE_PARAMETERS,
    content: 'posts',
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
    allowedParameters: POST_WRITE_PARAMETERS,
    content: 'pages',
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
    allowedParameters: ['include'],
    content: 'tags',
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

const OPAQUE_SEGMENT = /^\.{1,2}$/;

// Matches the path's segments as they arrive. A parameter is decoded before it's checked, as
// Ghost's router decodes it, and mustn't decode to `.`, `..` or a separator; a fixed segment
// isn't decoded, as the router matches it escaped.
function matches(route: Route, segments: readonly string[]): boolean {
  return (
    route.segments.length === segments.length &&
    route.segments.every((part, index) => {
      const segment = segments[index] as string;
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
 * A path matches nothing if it has an empty segment, other than the trailing `/`, or a segment
 * that is `.` or `..`, written out or escaped, because where such a path leads depends on which
 * parser reads it.
 */
export function findAllowedAdminApiRoute(
  pathname: string,
  method: FetchMethod,
): AllowedAdminApiRoute | undefined {
  if (!pathname.startsWith('/')) {
    return undefined;
  }
  const segments = pathname.slice(1).replace(/\/$/, '').split('/');
  if (segments.some((segment) => segment === '' || OPAQUE_SEGMENT.test(segment))) {
    return undefined;
  }
  const route = ROUTES.find((each) => each.method === method && matches(each, segments));
  return route && { route: route.route, scope: route.scope };
}
