import type { AppPermissionKey } from '../scopes.ts';
import { scopesOpening, serverGapsFor } from './app-routes.ts';
import { FETCH_PATH_MAX_LENGTH } from './fetch.ts';
import { readQuery, writeQuery } from './query.ts';
import { isContainedPath, type FetchMethod } from './rules.ts';
import { SERVER_GAPS, type ServerGap, type ServerGapName } from './server-gaps.ts';

// The URL parser reads an escaped separator as part of one segment, but whatever decodes the
// path next may read it as two segments.
const ENCODED_SEPARATOR = /%2f|%5c/i;

// Ghost still answers the API's old versioned addresses. Its rewrite looks for `ghost/api`
// anywhere in the address, the query included, and removes a version from it, so a request
// whose path or query mentions either could reach a route other than the one checked here.
const GHOST_API = /ghost\/api/i;
const VERSION_SEGMENT = /^(?:v2|v3|v4|canary)$/i;

// The site's public details, for showing its branding. Ghost serves them without signing in, so
// they need no scope, and reads no query parameters on them.
const SITE = /^\/site\/?$/i;

// Decodes every escape that's valid on its own, byte by byte, and leaves the rest. Only used
// to look for the ASCII text above, so a byte of a longer character can decode to anything.
const decodeEscapes = (text: string) =>
  text.replace(/%[0-9a-f]{2}/gi, (escape) => String.fromCharCode(parseInt(escape.slice(1), 16)));

/** What `checkAdminApiRequest` checks: an app's `fetch`, already validated by its schema. */
export interface AdminApiRequest {
  readonly path: string;
  readonly method?: FetchMethod | undefined;
  readonly body?: string | undefined;
}

/**
 * The result of `checkAdminApiRequest`: the URL to request, the path within the API it reaches
 * and the server gaps the bridge covered on it, or the code Admin refuses the request with. A
 * refusal as `blocked` says why in `detail`, naming the method and path, or what in the request
 * was refused, and names the server gap that refused it in `gap`, when one did.
 */
export type AdminApiRequestCheck =
  | {
      readonly url: URL;
      readonly pathname: string;
      readonly gaps: readonly ServerGapName[];
      readonly problem?: undefined;
    }
  | { readonly problem: 'invalid_path' }
  | {
      readonly problem: 'blocked';
      readonly pathname: string;
      readonly detail: string;
      readonly gap?: ServerGapName;
    };

/**
 * Resolves a request an app asks Admin to make against the Admin API root, such as
 * `https://site.example/ghost/api/admin/`, and covers the gaps in what Ghost's server checks.
 *
 * A leading `/` means the API root, not the origin, so `/posts/?limit=5` is
 * `https://site.example/ghost/api/admin/posts/?limit=5`. The root may be written with or
 * without its trailing `/`, and its query and fragment are ignored.
 *
 * The result is `invalid_path` unless the path stays under the root, on the root's origin.
 * Absolute and protocol-relative URLs, paths that don't start with `/`, backslashes, `..` in
 * any spelling the URL parser understands, and escaped separators are all `invalid_path`.
 *
 * A path that stays under the root is `blocked` when its path or query mentions `ghost/api`,
 * or its first segment is an old API version (`v4`); when its query isn't one every parser reads
 * alike (`readQuery`); when `APP_ROUTES` lists no route for it with this method, unless it reads
 * the site's public details; when the installation wasn't approved for the scope its route is
 * listed under; or when a server gap on the route refuses it.
 *
 * The query is never sent as the app spelled it. The bridge reads it strictly and writes its
 * own, one `name=value` for each parameter, so the parameters the gaps acted on are exactly the
 * ones the server reads.
 *
 * `approvedScopes` are those of the installation the app runs as, which the route's scope
 * check and the include and sort gaps read. Every gap `APP_ROUTES` names for the route is
 * applied, in order: the first to refuse the request ends it, and each of the others may
 * rewrite its query.
 */
export function checkAdminApiRequest(
  request: AdminApiRequest,
  apiRoot: URL,
  approvedScopes: ReadonlySet<AppPermissionKey>,
): AdminApiRequestCheck {
  const { path, method = 'GET', body } = request;
  if (typeof path !== 'string' || path.length > FETCH_PATH_MAX_LENGTH || !isContainedPath(path)) {
    return { problem: 'invalid_path' };
  }

  const root = new URL(apiRoot.href);
  root.search = '';
  root.hash = '';
  if (!root.pathname.endsWith('/')) {
    root.pathname = `${root.pathname}/`;
  }

  // With a `.` in front, the path becomes `./…`, which is always relative to the root's path,
  // so the parser can't read it as a scheme or a host. Only `..` can climb out, and the
  // checks below catch that however the parser resolved it.
  const url = new URL(`.${path}`, root);

  if (
    url.origin !== root.origin ||
    !url.pathname.startsWith(root.pathname) ||
    ENCODED_SEPARATOR.test(url.pathname)
  ) {
    return { problem: 'invalid_path' };
  }

  // Slice against the root as normalised above, so a root written without its trailing `/`
  // can't shift the slice.
  const pathname = url.pathname.slice(root.pathname.length - 1);
  const blocked = (detail: string, gap?: ServerGapName) =>
    ({ problem: 'blocked', pathname, detail, ...(gap && { gap }) }) as const;

  const address = `${pathname}${url.search}`;
  const [first = ''] = decodeEscapes(pathname).split('/').filter(Boolean);
  if (
    GHOST_API.test(address) ||
    GHOST_API.test(decodeEscapes(address)) ||
    VERSION_SEGMENT.test(first)
  ) {
    return blocked(`Apps can't use ${method} ${pathname}: it names an old API address`);
  }
  const read = readQuery(url.search);
  if ('refused' in read) {
    return blocked(`${read.refused} (${method} ${pathname})`);
  }

  const scopes = scopesOpening(pathname, method);
  const site = method === 'GET' && SITE.test(pathname);
  if (scopes.length === 0 && !site) {
    return blocked(`Apps can't use ${method} ${pathname}`);
  }
  const unapproved = scopes.find((scope) => !approvedScopes.has(scope));
  if (unapproved) {
    return blocked(`This app wasn't approved for ${unapproved}, which ${method} ${pathname} needs`);
  }

  let query = read.parameters;
  const gaps: readonly ServerGapName[] = site ? ['noParameters'] : serverGapsFor(pathname, method);
  for (const name of gaps) {
    const gap: ServerGap = SERVER_GAPS[name];
    const outcome = gap.apply({ method, pathname, query, body, approvedScopes });
    if ('refused' in outcome) {
      return blocked(outcome.refused, name);
    }
    ({ query } = outcome);
  }

  url.search = writeQuery(query);
  return { url, pathname, gaps };
}
