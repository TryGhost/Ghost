import { isBlockedAdminApiPath } from './blocklist.ts';
import { FETCH_PATH_MAX_LENGTH } from './fetch.ts';
import { isContainedPath } from './rules.ts';

// A separator written as an escape is one segment to the URL parser and possibly two to
// whatever decodes it next.
const ENCODED_SEPARATOR = /%2f|%5c/i;

/**
 * What `checkAdminApiPath` makes of a path: the URL to request and the path within the API
 * that the blocklist read, or the code Admin refuses the request with.
 */
export type AdminApiPathCheck =
  | { readonly url: URL; readonly pathname: string; readonly problem?: undefined }
  | { readonly problem: 'invalid_path' }
  | { readonly problem: 'blocked'; readonly pathname: string };

/**
 * Checks the path an app passes to `fetch` against the Admin API root, such as
 * `https://site.example/ghost/api/admin/`, and against the blocklist, in one step.
 *
 * A leading `/` means the API root, not the origin, so `/posts/?limit=5` is
 * `https://site.example/ghost/api/admin/posts/?limit=5`. The root may be written with or
 * without its trailing `/`, and its query and fragment are ignored.
 *
 * The path is `invalid_path` unless it stays under the root on the root's own origin:
 * absolute and protocol-relative URLs, a path that does not start with `/`, backslashes,
 * `..` in any spelling the URL parser understands, and escaped separators all are. A path
 * that stays under the root is then `blocked` if the blocklist closes where it lands, read
 * as `pathname`: relative to the root, with its leading `/`, without the query.
 */
export function checkAdminApiPath(path: string, apiRoot: URL): AdminApiPathCheck {
  if (typeof path !== 'string' || path.length > FETCH_PATH_MAX_LENGTH || !isContainedPath(path)) {
    return { problem: 'invalid_path' };
  }

  const root = new URL(apiRoot.href);
  root.search = '';
  root.hash = '';
  if (!root.pathname.endsWith('/')) {
    root.pathname = `${root.pathname}/`;
  }

  // Written as `./…`, the reference is always relative to the root's own path, so the
  // parser cannot read it as a scheme or a host. Only `..` can climb out, and the checks
  // below catch it whatever the parser made of it.
  const url = new URL(`.${path}`, root);

  if (
    url.origin !== root.origin ||
    !url.pathname.startsWith(root.pathname) ||
    ENCODED_SEPARATOR.test(url.pathname)
  ) {
    return { problem: 'invalid_path' };
  }

  // Cut against the root as normalised above, so a root written without its trailing `/`
  // cannot shift the cut and slip a path past the blocklist.
  const pathname = url.pathname.slice(root.pathname.length - 1);
  if (isBlockedAdminApiPath(pathname)) {
    return { problem: 'blocked', pathname };
  }
  return { url, pathname };
}
