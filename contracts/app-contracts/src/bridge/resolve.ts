import type { AppPermissionKey } from '../scopes.ts';
import { findAllowedAdminApiRoute, scopeForField, type AdminApiRouteGroup } from './allowlist.ts';
import { refusedContent } from './content.ts';
import { FETCH_PATH_MAX_LENGTH } from './fetch.ts';
import { readQuery, writeQuery } from './query.ts';
import { isContainedPath, type FetchMethod } from './rules.ts';

// The URL parser reads an escaped separator as part of one segment, but whatever decodes the
// path next may read it as two segments.
const ENCODED_SEPARATOR = /%2f|%5c/i;

// Ghost still answers the API's old versioned addresses. Its rewrite looks for `ghost/api`
// anywhere in the address, the query included, and removes a version from it, so a request
// whose path or query mentions either could reach a route other than the one checked here.
const GHOST_API = /ghost\/api/i;
const VERSION_SEGMENT = /^(?:v2|v3|v4|canary)$/i;

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
 * and the allowlist group that allows it, or the code Admin refuses the request with. A refusal
 * as `blocked` says why in `detail`, naming the method and path, or what in the request was refused.
 */
export type AdminApiRequestCheck =
  | {
      readonly url: URL;
      readonly pathname: string;
      readonly group: AdminApiRouteGroup;
      readonly problem?: undefined;
    }
  | { readonly problem: 'invalid_path' }
  | { readonly problem: 'blocked'; readonly pathname: string; readonly detail: string };

/**
 * Checks a request an app asks Admin to make against the Admin API root, such as
 * `https://site.example/ghost/api/admin/`, and against the allowlist, in one step.
 *
 * A leading `/` means the API root, not the origin, so `/posts/?limit=5` is
 * `https://site.example/ghost/api/admin/posts/?limit=5`. The root may be written with or
 * without its trailing `/`, and its query and fragment are ignored.
 *
 * The result is `invalid_path` unless the path stays under the root, on the root's origin.
 * Absolute and protocol-relative URLs, paths that don't start with `/`, backslashes, `..` in
 * any spelling the URL parser understands, and escaped separators are all `invalid_path`.
 *
 * A path that stays under the root is `blocked` unless the allowlist has a route for where it
 * resolves to, with this method. It's also `blocked` when its path or query mentions `ghost/api`,
 * or its first segment is an old API version (`v4`), whatever the allowlist says; when its query
 * isn't one every parser reads alike (`readQuery`); when it carries a query parameter its group
 * doesn't list; when its group checks content and its body holds a field `refusedContent`
 * refuses; or when it needs a scope, by its route, an `include` or an `order`, that isn't among
 * `approvedScopes`: those of the installation the app runs as.
 *
 * The query is never sent as the app spelled it. The bridge reads it strictly and writes its
 * own, one `name=value` for each parameter, so the parameters checked here are exactly the ones
 * the server reads.
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
  const blocked = (detail: string) => ({ problem: 'blocked', pathname, detail }) as const;

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
  let query = read.parameters;

  const allowed = findAllowedAdminApiRoute(pathname, method);
  if (!allowed) {
    return blocked(`Apps can't use ${method} ${pathname}`);
  }
  const { group, resource } = allowed;
  const unapproved = (scope: AppPermissionKey | null, what: string) =>
    scope !== null && !approvedScopes.has(scope)
      ? blocked(`This app wasn't approved for ${scope}, which ${what} needs`)
      : undefined;

  const forRoute = unapproved(group.scope, `${method} ${pathname}`);
  if (forRoute) {
    return forRoute;
  }

  const { allowedParameters } = group;
  for (const name of query.keys()) {
    if (!allowedParameters.includes(name)) {
      return blocked(`Apps can't use the ${name} parameter on ${method} ${pathname}`);
    }
  }

  // Ghost splits both on commas and trims each part, and reads a sort as a field and a
  // direction.
  const { fieldScopes } = resource;
  const included = (query.get('include') ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (fieldScopes) {
    for (const relation of included) {
      const scope = scopeForField(fieldScopes, relation);
      if (scope === undefined) {
        return blocked(`Apps can't include ${relation} on ${method} ${pathname}`);
      }
      const refused = unapproved(scope, `including ${relation}`);
      if (refused) {
        return refused;
      }
    }
    for (const part of (query.get('order') ?? '').split(',')) {
      const [field = ''] = part.trim().split(/\s+/);
      const refused = unapproved(scopeForField(fieldScopes, field) ?? null, `ordering by ${field}`);
      if (refused) {
        return refused;
      }
    }
  }

  // Ghost includes how a post performed by default, so a request that names nothing names what
  // the app may have. Ghost leaves its defaults out when a request asks for some `fields`, so
  // such a request is left alone and isn't sent relations it never asked for. A route that takes
  // no `include`, such as a delete, is left alone too. `authors` needs no scope of its own, so
  // what's named is never empty, which Ghost would refuse.
  const defaults = resource.defaultIncludes?.[pathname.split('/')[1]?.toLowerCase() ?? ''];
  const takesInclude = allowedParameters.includes('include');
  const asksForFields = (query.get('fields') ?? '') !== '';
  if (defaults && fieldScopes && takesInclude && !asksForFields && included.length === 0) {
    const allowedDefaults = defaults.filter((relation) => {
      const scope = scopeForField(fieldScopes, relation);
      return scope === null || (scope !== undefined && approvedScopes.has(scope));
    });
    query = new Map(query).set('include', allowedDefaults.join(','));
  }

  if (group.checksContent && body !== undefined) {
    let content: unknown;
    try {
      content = JSON.parse(body);
    } catch {
      return blocked(`Apps can only send JSON to ${method} ${pathname}`);
    }
    const refused = refusedContent(content);
    if (refused) {
      return blocked(`Apps can't send ${refused} to ${method} ${pathname}`);
    }
  }

  url.search = writeQuery(query);
  return { url, pathname, group };
}
