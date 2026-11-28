import type { AppPermissionKey } from '../scopes.ts';
import type { Query } from './query.ts';
import { isRecord, type FetchMethod } from './rules.ts';

/**
 * What the bridge still refuses or rewrites in an app's Admin API request, because Ghost's
 * server doesn't yet. It is a list of gaps in the server, not a list of what apps may call.
 *
 * Apps call the Admin API with their session's token. Ghost's server decides which routes that
 * token reaches: it holds every call to the installation's approved scopes and refuses a route
 * no scope covers, apart from `GET /site`, the site's public details, which every app reaches,
 * so the bridge sends any Admin API path on and an app gets the server's own answer. What the
 * server doesn't check yet is what a request carries within a route it allows, and each gap
 * here covers one such thing until the issue it names moves the check to the server:
 *
 * - Sending a post as email, or writing HTML as its content: the `newsletter`, `email_segment`
 *   and `source` parameters on a post or page write (BER-4142).
 * - Re-rendering a post's HTML, or converting a mobiledoc post to Lexical for good: the
 *   `force_rerender` and `convert_to_lexical` parameters on a post or page write (BER-4142).
 * - Script in a write: code injection at any depth and a `mobiledoc` that isn't `null`, in the
 *   body of a post, page or tag write (BER-4142).
 * - Bulk edit of posts and pages, which writes without the checks a single edit gets
 *   (BER-4142).
 * - Copying a post or page, which answers with the copy, and so with the original's content,
 *   under `post:add` alone, without `post:read` (BER-4141).
 * - What reading a post returns beyond the post: a related object needs its own scope, and how
 *   a post performed needs `post:readStats`, through the includes and sort fields that reach
 *   them. Ghost includes some of both by default, so a request that names no `include` is sent
 *   with the defaults the app may have (BER-4141, BER-4143).
 *
 * A gap is one unit: the issues that retire it, and what it does to a request, built by one of
 * the constructors below. Retiring a gap is deleting its entry in `SERVER_GAPS`, the
 * constructor nothing else uses, and its test in Ghost. `APP_ROUTES` (`app-routes.ts`) says
 * which gaps apply on which route, and the bridge applies every one of them, in order.
 *
 * A gap reads the query the bridge read strictly and writes itself (`query.ts`), so it acts
 * on the parameters the server will read.
 *
 * A test in Ghost shows, for each gap, that the bridge acts on a request by that gap and that
 * the server still accepts the same request; when the server starts refusing it, that test
 * fails and the gap is deleted.
 *
 * What the server and these gaps both still let through, for the security review before apps
 * open to outside developers:
 *
 * - Publishing and unpublishing: a write can change a post's status, schedule it, or change who
 *   can read it (`visibility`, `tiers`), with no confirmation from the publisher. Publishing a
 *   scheduled post that already has a newsletter sends its email then, with no parameter.
 * - Staff emails: `GET /users/` returns every staff user's email, and so does every post's
 *   `authors`, which are full user records on the Admin API, with `status` and `last_seen`.
 *   The bridge names `authors` on every post and page request that names no `include`, one
 *   that asks for some `fields` included, so a post comes with them unless the app names
 *   includes without them.
 * - Filters: `filter` is passed to Ghost as it is, and can reach a post's related objects that
 *   `include` needs a scope for, such as `tags.visibility:internal` without `tag:browse`, or test
 *   guesses at `authors.email`.
 * - Content: a write can put HTML and script in a post or page, in a Lexical card or a caption
 *   for one, which Ghost serves on the site's own origin, and on Admin's where the two share
 *   one. Only code injection and a mobiledoc that isn't `null` are refused.
 */

/** The request a gap is applied to, as the bridge resolved and read it. */
export interface GapRequest {
  readonly method: FetchMethod;
  /** The path within the Admin API, such as `/posts/` */
  readonly pathname: string;
  readonly query: Query;
  /** The body as the app sent it, if it sent one */
  readonly body: string | undefined;
  /** The scopes of the installation the app runs as */
  readonly approvedScopes: ReadonlySet<AppPermissionKey>;
}

/** What a gap makes of a request: why it is refused, or the query to send it with. */
export type GapOutcome = { readonly refused: string } | { readonly query: Query };

/** One thing the server doesn't check yet, and what the bridge does about it meanwhile. */
export interface ServerGap {
  /** The Linear issues that move this check to the server. When they land, the gap goes. */
  readonly retiredBy: readonly string[];
  /** Refuses the request, or passes it on with the query it should be sent with. */
  apply(request: GapRequest): GapOutcome;
}

const where = ({ method, pathname }: GapRequest) => `${method} ${pathname}`;

/** Refuses the route whole. */
function refusesRoute(retiredBy: readonly string[]): ServerGap {
  return {
    retiredBy,
    apply: (request) => ({ refused: `Apps can't use ${where(request)}` }),
  };
}

/** Refuses a request that names any of these query parameters. */
function refusesParameters(
  retiredBy: readonly string[],
  parameters: readonly string[],
): ServerGap & { readonly parameters: readonly string[] } {
  return {
    retiredBy,
    parameters,
    apply(request) {
      const named = parameters.find((parameter) => request.query.has(parameter));
      return named
        ? { refused: `Apps can't use the ${named} parameter on ${where(request)}` }
        : { query: request.query };
    },
  };
}

// Ghost outputs code injection as it is on every page that shows the post or tag, so it is
// refused with any value, `null` included: an app leaves it out of the body.
const CODE_INJECTION = ['codeinjection_head', 'codeinjection_foot'];

/**
 * Refuses a write whose body isn't JSON, or holds code injection, or a `mobiledoc` that isn't
 * `null`: mobiledoc is deprecated and Ghost converts it cards and all, so apps write `lexical`
 * from the start. The whole body is checked, at any depth, so a field can't hide in a nested
 * object, such as a tag in a post's `tags`.
 */
function refusesScriptInContent(retiredBy: readonly string[]): ServerGap {
  return {
    retiredBy,
    apply(request) {
      if (request.body === undefined) {
        return { query: request.query };
      }
      let content: unknown;
      try {
        content = JSON.parse(request.body);
      } catch {
        return { refused: `Apps can only send JSON to ${where(request)}` };
      }
      const values: unknown[] = [content];
      for (let index = 0; index < values.length; index += 1) {
        const value = values[index];
        if (!isRecord(value)) {
          continue;
        }
        for (const [key, field] of Object.entries(value)) {
          if (CODE_INJECTION.includes(key) || (key === 'mobiledoc' && field !== null)) {
            return { refused: `Apps can't send ${key} to ${where(request)}` };
          }
          values.push(field);
        }
      }
      return { query: request.query };
    },
  };
}

/**
 * The relations `include` may name and the fields `order` sorts by that need a scope, mapped to
 * that scope, or to `null` when reaching the route is enough. A key ending in `.*` covers every
 * name under it.
 */
export type FieldScopes = Readonly<Record<string, AppPermissionKey | null>>;

/**
 * The scope a field in `fieldScopes` needs: `null` when reaching the route is enough, and
 * `undefined` when the map doesn't name it.
 */
export function scopeForField(
  fieldScopes: FieldScopes,
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

/** A gap that holds what a read returns beyond its own resource to the app's scopes. */
export interface FieldsGap extends ServerGap {
  readonly fieldScopes: FieldScopes;
  /** What Ghost includes when a request names no `include`, less what apps can't have */
  readonly defaultIncludes: readonly string[];
}

/**
 * Holds a request's `include` and `order` to the app's scopes. Ghost splits both on commas and
 * trims each part, and reads a sort as a field and a direction. An `include` the map doesn't
 * name is refused, one it names needs its scope, and so does an `order` field it names.
 *
 * Given `defaultIncludes`, what Ghost includes when a request names nothing, a request that
 * names no `include` is sent with those of them the app may have, so what's named is what the
 * server acts on and its own defaults, which hold how a post performed, never apply. That goes
 * for a request that asks for some `fields` too. Ghost adds no defaults to a read that does,
 * but it honours `fields` only on a read, and only when it reads it as a list, so a write with
 * `fields` gets its defaults; naming them whatever `fields` says is what keeps them off every
 * request. A read that asks for some fields comes back with what's named as well. One of them
 * should need no scope, so what's named is never empty, which Ghost would refuse.
 */
function holdsFieldsToScopes(
  retiredBy: readonly string[],
  fieldScopes: FieldScopes,
  defaultIncludes: readonly string[] = [],
): FieldsGap {
  const lacks = (scope: AppPermissionKey | null, { approvedScopes }: GapRequest) =>
    scope !== null && !approvedScopes.has(scope);
  const needs = (scope: AppPermissionKey | null, what: string) => ({
    refused: `This app wasn't approved for ${scope}, which ${what} needs`,
  });

  return {
    retiredBy,
    fieldScopes,
    defaultIncludes,
    apply(request) {
      const { query } = request;
      const included = (query.get('include') ?? '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      for (const relation of included) {
        const scope = scopeForField(fieldScopes, relation);
        if (scope === undefined) {
          return { refused: `Apps can't include ${relation} on ${where(request)}` };
        }
        if (lacks(scope, request)) {
          return needs(scope, `including ${relation}`);
        }
      }
      for (const part of (query.get('order') ?? '').split(',')) {
        const [field = ''] = part.trim().split(/\s+/);
        const scope = scopeForField(fieldScopes, field) ?? null;
        if (lacks(scope, request)) {
          return needs(scope, `ordering by ${field}`);
        }
      }
      if (included.length > 0 || defaultIncludes.length === 0) {
        return { query };
      }
      const allowed = defaultIncludes.filter((relation) => {
        const scope = scopeForField(fieldScopes, relation);
        return scope !== undefined && !lacks(scope, request);
      });
      return { query: new Map(query).set('include', allowed.join(',')) };
    },
  };
}

// A related object needs its own scope, other than a post's authors, which come with reading
// posts, as full user records with their emails. How a post performed by email, in signups and
// conversions, and in feedback is `post:readStats`'s. Authors' roles and revisions' authors
// aren't for apps.
const POST_FIELD_SCOPES: FieldScopes = {
  tags: 'tag:browse',
  authors: null,
  tiers: 'product:browse',
  newsletter: 'newsletter:browse',
  post_revisions: null,
  email: 'post:readStats',
  'email.*': 'post:readStats',
  'count.*': 'post:readStats',
  sentiment: 'post:readStats',
};

const READS = ['BER-4141', 'BER-4143'] as const;
const WRITES = ['BER-4142'] as const;

export const SERVER_GAPS = {
  /** Asking Ghost to email a post, or to take HTML as its content as it is. */
  emailAndHtmlSource: refusesParameters(WRITES, ['newsletter', 'email_segment', 'source']),
  /**
   * Asking Ghost to re-render a post's HTML from its content, or to convert a mobiledoc post's
   * stored content to Lexical, which can't be undone.
   */
  rerenderOrConvert: refusesParameters(WRITES, ['force_rerender', 'convert_to_lexical']),
  /**
   * Code injection, which Ghost outputs as it is, and mobiledoc, which it converts cards and all.
   */
  scriptInContent: refusesScriptInContent(WRITES),
  /**
   * Bulk edit writes to the database directly, with none of the checks a single edit gets, so
   * until the server checks each of its actions it is refused.
   */
  bulkEdit: refusesRoute(WRITES),
  /**
   * A copy answers with the new post, which holds everything the original does, and checks only
   * `post:add`. Until the server asks for read access to the original, it is refused.
   */
  copy: refusesRoute(['BER-4141']),
  // Ghost's own defaults for posts and for pages, less authors' roles; a test in Ghost holds
  // them to its serializers.
  postFields: holdsFieldsToScopes(READS, POST_FIELD_SCOPES, [
    'tags',
    'authors',
    'email',
    'tiers',
    'newsletter',
    'count.clicks',
  ]),
  pageFields: holdsFieldsToScopes(READS, POST_FIELD_SCOPES, [
    'tags',
    'authors',
    'tiers',
    'count.signups',
    'count.paid_conversions',
  ]),
  /**
   * How many posts a newsletter sent comes with listing it. How many members subscribe is member
   * data, which no scope grants yet.
   */
  newsletterFields: holdsFieldsToScopes(['BER-4141'], { 'count.posts': null }),
} as const satisfies Record<string, ServerGap>;

export type ServerGapName = keyof typeof SERVER_GAPS;
