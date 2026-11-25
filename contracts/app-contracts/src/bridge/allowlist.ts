import type { AppResourceName, AppPermissionKey } from '../scopes.ts';
import type { FetchMethod } from './rules.ts';

/**
 * The Admin API routes apps can reach through the fetch escape hatch. Everything else is
 * refused.
 *
 * Apps call the Admin API with the staff user's own session. This list stands in for an
 * app-scoped token with permissions, which checks on the server what was approved. Its routes
 * are grouped by the registry's resources, then under the scope that opens them, and
 * `checkAdminApiRequest` refuses a route whose scope the installation wasn't approved for, as
 * Admin holds the approved manifest while the app runs. It is still a stopgap: the server
 * checks nothing an app does through the bridge.
 *
 * What's allowed, and why:
 *
 * - Posts, pages and tags: list, read, create, edit and delete one at a time. Apps exist to
 *   work with the publisher's content. Bulk edits, bulk deletes, exports, copies, uploads and
 *   gift links are left out.
 * - Staff users, tiers and newsletters: list only, for showing an author, an access level or a
 *   newsletter. A newsletter's member counts are left out, as no scope grants member data.
 *   Members, settings, integrations and everything that hands out lasting access are left out.
 * - The search index of posts, pages and tags, and slug generation, which Admin's own editor
 *   uses to pick a slug before saving.
 * - The site's public details: its title, description, logo, icon, cover image and accent
 *   colour, for showing the site's branding. They need no scope.
 * - A post's related tags, tiers and newsletter only with their own scopes, and how a post
 *   performed, through the includes and sort fields that reach it, only with `post:read_stats`.
 *   Ghost includes some of both by default, so a request that names no `include` and no
 *   `fields`, which Ghost adds no defaults to, is sent with the defaults the app may have.
 * - Every request may carry only the query parameters its group lists, by exact name, so an
 *   `include` spelled `include[]` can't slip past the checks on it.
 *
 * Writes of posts, pages and tags are checked further, so an app can't ask Ghost to email a post,
 * set code injection or write mobiledoc: a write's parameters leave out `newsletter`,
 * `email_segment` and `source`, and `refusedContent` checks its body.
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
 * - Staff emails: `GET /users/` returns every staff user's email, and so does every post's
 *   `authors`, which are full user records on the Admin API, with `status` and `last_seen`.
 *   Reading posts includes them, so every app with `post:browse` gets them.
 * - Filters: `filter` is passed to Ghost as it is, and can reach a post's related objects that
 *   `include` needs a scope for, such as `tags.visibility:internal` without `tag:browse`, or test
 *   guesses at `authors.email`. No filter reaches how a post performed.
 * - Content: a write can put HTML and script in a post or page, in a Lexical card or a caption
 *   for one, which Ghost serves on the site's own origin, and on Admin's where the two share
 *   one. It can also put HTML in `feature_image_caption`, which emails show as it is, so it
 *   reaches members when the post is sent as a newsletter. Only code injection and a mobiledoc
 *   that isn't `null` are refused.
 *
 * Routes are written as `METHOD /path`, in path segments. `:id` matches only an object ID: 24
 * lowercase hexadecimal characters. Any other `:name` matches any one segment, such as a slug.
 * A route matches with or without a trailing `/`, and its fixed segments in any case, as Ghost's
 * router reads them. A fixed segment must be written out, not escaped: Ghost's router matches
 * the path as it arrives, so `/posts/sl%75g/…` doesn't reach the slug route.
 */

/** Routes that one registry scope opens. */
export interface AdminApiRouteGroup {
  /**
   * The registry scope these routes stand for, such as `post:edit`, or `null` for routes any app
   * may call.
   */
  readonly scope: AppPermissionKey | null;
  /** Each route as `METHOD /path`, relative to the Admin API root. */
  readonly routes: readonly string[];
  /**
   * The only query parameters a request in this group may carry, by exact name. Any other name
   * is refused, so a spelling Ghost's query parser reads differently, such as `[newsletter]` or
   * `include[]`, can't slip a parameter past the checks. Every group lists them.
   */
  readonly allowedParameters: readonly string[];
  /** Whether a write in this group sends content, whose body `refusedContent` checks. */
  readonly checksContent?: true;
}

/**
 * One resource's routes, grouped by the scope that opens them, and what its objects can include
 * or be sorted by, which is the same whichever route returns them.
 */
export interface AdminApiResource {
  readonly groups: readonly AdminApiRouteGroup[];
  /**
   * The relations `include` may name and the fields `order` sorts by that need a scope of their
   * own, mapped to that scope, or to `null` when the route's own scope is enough. A key ending
   * in `.*` covers every name under it. With this map, an `include` it doesn't name is refused,
   * and an `order` field it doesn't name needs nothing more. Reading a post can include how it
   * performed, which only `post:read_stats` gives.
   */
  readonly fieldScopes?: Readonly<Record<string, AppPermissionKey | null>>;
  /**
   * What Ghost includes when a request names nothing, by the route's first path segment, such as
   * `posts`. Ghost's defaults hold how a post performed, so when an app names no `include` and no
   * `fields` on a route that takes one, the bridge names these itself, keeping only the ones
   * `fieldScopes` lets the app have.
   */
  readonly defaultIncludes?: Readonly<Record<string, readonly string[]>>;
}

// What Ghost reads on a post or page write, minus `newsletter` and `email_segment`, which send
// the post as email, `source=html`, which turns HTML into the post's content as it is, and the
// rest of what only Admin's editor needs.
const POST_WRITE_PARAMETERS = ['include', 'formats', 'save_revision'] as const;

// What Ghost reads on a list of tags, tiers, newsletters or staff users, minus `debug`.
const LIST_PARAMETERS = ['include', 'filter', 'fields', 'limit', 'order', 'page'] as const;

/**
 * The allowlist, by the registry's resources, and `site` for the site's public details, which
 * need no scope. Each group's scope belongs to the resource it's listed under.
 */
export const ADMIN_API_ALLOWLIST: Readonly<Record<AppResourceName | 'site', AdminApiResource>> = {
  post: {
    groups: [
      {
        scope: 'post:browse',
        routes: ['GET /posts', 'GET /pages', 'GET /search-index/posts', 'GET /search-index/pages'],
        // What Ghost's post and page routes read, minus `debug` and `collection`.
        allowedParameters: [
          'include',
          'filter',
          'fields',
          'formats',
          'limit',
          'order',
          'page',
          'absolute_urls',
        ],
      },
      {
        scope: 'post:read',
        routes: [
          'GET /posts/:id',
          'GET /posts/slug/:slug',
          'GET /pages/:id',
          'GET /pages/slug/:slug',
        ],
        allowedParameters: ['include', 'fields', 'formats', 'absolute_urls'],
      },
      {
        scope: 'post:add',
        routes: ['POST /posts', 'POST /pages'],
        allowedParameters: POST_WRITE_PARAMETERS,
        checksContent: true,
      },
      {
        scope: 'post:edit',
        routes: ['PUT /posts/:id', 'PUT /pages/:id'],
        allowedParameters: POST_WRITE_PARAMETERS,
        checksContent: true,
      },
      // A delete sends nothing and answers with nothing, so it takes no parameters.
      {
        scope: 'post:destroy',
        routes: ['DELETE /posts/:id', 'DELETE /pages/:id'],
        allowedParameters: [],
      },
    ],
    // A related object needs its own scope, other than a post's authors, which come with reading
    // posts, as full user records with their emails. How a post performed by email, in signups
    // and conversions, and in feedback is `post:read_stats`'s. Authors' roles and revisions'
    // authors aren't for apps.
    fieldScopes: {
      tags: 'tag:browse',
      authors: null,
      tiers: 'product:browse',
      newsletter: 'newsletter:browse',
      post_revisions: null,
      email: 'post:read_stats',
      'email.*': 'post:read_stats',
      'count.*': 'post:read_stats',
      sentiment: 'post:read_stats',
    },
    // Ghost's own defaults for posts and pages, less authors' roles; a test in Ghost holds them
    // to its serializers.
    defaultIncludes: {
      posts: ['tags', 'authors', 'email', 'tiers', 'newsletter', 'count.clicks'],
      pages: ['tags', 'authors', 'tiers', 'count.signups', 'count.paid_conversions'],
    },
  },
  tag: {
    groups: [
      {
        scope: 'tag:browse',
        routes: ['GET /tags', 'GET /search-index/tags'],
        allowedParameters: LIST_PARAMETERS,
      },
      {
        scope: 'tag:read',
        routes: ['GET /tags/:id', 'GET /tags/slug/:slug'],
        allowedParameters: ['include', 'filter', 'fields'],
      },
      {
        scope: 'tag:add',
        routes: ['POST /tags'],
        allowedParameters: ['include'],
        checksContent: true,
      },
      {
        scope: 'tag:edit',
        routes: ['PUT /tags/:id'],
        allowedParameters: ['include'],
        checksContent: true,
      },
      { scope: 'tag:destroy', routes: ['DELETE /tags/:id'], allowedParameters: [] },
    ],
  },
  product: {
    groups: [
      { scope: 'product:browse', routes: ['GET /tiers'], allowedParameters: LIST_PARAMETERS },
    ],
  },
  newsletter: {
    groups: [
      {
        scope: 'newsletter:browse',
        routes: ['GET /newsletters'],
        allowedParameters: LIST_PARAMETERS,
      },
    ],
    // How many posts a newsletter sent comes with listing it. How many members subscribe is
    // member data, which no scope grants yet, so it isn't for apps.
    fieldScopes: { 'count.posts': null },
  },
  slug: {
    groups: [
      {
        scope: 'slug:generate',
        routes: ['GET /slugs/:type/:name', 'GET /slugs/:type/:name/:id'],
        allowedParameters: [],
      },
    ],
  },
  user: {
    groups: [{ scope: 'user:browse', routes: ['GET /users'], allowedParameters: LIST_PARAMETERS }],
  },
  // The site's public details, for showing its branding. Ghost serves them without signing in,
  // so they need no scope.
  site: { groups: [{ scope: null, routes: ['GET /site'], allowedParameters: [] }] },
};

const OBJECT_ID = /^[0-9a-f]{24}$/;

type Segment =
  | { readonly kind: 'fixed'; readonly value: string }
  | { readonly kind: 'id' }
  | { readonly kind: 'any' };

interface Route {
  readonly method: string;
  readonly segments: readonly Segment[];
  readonly route: string;
  readonly group: AdminApiRouteGroup;
  readonly resource: AdminApiResource;
}

const ROUTES: readonly Route[] = Object.values(ADMIN_API_ALLOWLIST).flatMap((resource) =>
  resource.groups.flatMap((group) =>
    group.routes.map((route): Route => {
      const [method = '', path = ''] = route.split(' ');
      return {
        method,
        route,
        group,
        resource,
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
  ),
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

/**
 * The scope a field in `fieldScopes` needs: `null` when the group's own is enough, and
 * `undefined` when the map doesn't name it.
 */
export function scopeForField(
  fieldScopes: Readonly<Record<string, AppPermissionKey | null>>,
  field: string,
): AppPermissionKey | null | undefined {
  const name = field.toLowerCase();
  for (const [key, scope] of Object.entries(fieldScopes)) {
    if (key.endsWith('.*') ? name.startsWith(key.slice(0, -1)) : name === key) {
      return scope;
    }
  }
  return undefined;
}

/** The route an allowed request matched, the group it belongs to and that group's resource. */
export interface AllowedAdminApiRoute {
  /** The route as the allowlist writes it, such as `PUT /posts/:id`. */
  readonly route: string;
  readonly group: AdminApiRouteGroup;
  readonly resource: AdminApiResource;
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
  return route && { route: route.route, group: route.group, resource: route.resource };
}
