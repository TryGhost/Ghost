import { isBlockedAdminApiPath } from './blocklist.ts';
import { FETCH_PATH_MAX_LENGTH } from './fetch.ts';
import { isContainedPath, type FetchMethod } from './rules.ts';

// The URL parser reads an escaped separator as part of one segment, but whatever decodes the
// path next may read it as two segments.
const ENCODED_SEPARATOR = /%2f|%5c/i;

/**
 * The result of `checkAdminApiPath`: either the URL to request and the path within the API
 * that the blocklist checked, or the code Admin refuses the request with.
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
 * The result is `invalid_path` unless the path stays under the root, on the root's origin.
 * Absolute and protocol-relative URLs, paths that don't start with `/`, backslashes, `..` in
 * any spelling the URL parser understands, and escaped separators are all `invalid_path`. A
 * path that stays under the root is `blocked` if the blocklist covers where it resolves to,
 * for `method`.
 * The blocklist checks it as `pathname`: relative to the root, with its leading `/`, and
 * without the query.
 */
export function checkAdminApiPath(
  path: string,
  method: FetchMethod,
  apiRoot: URL,
): AdminApiPathCheck {
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
  // can't shift the slice and let a path slip past the blocklist.
  const pathname = url.pathname.slice(root.pathname.length - 1);
  if (isBlockedAdminApiPath(pathname, method)) {
    return { problem: 'blocked', pathname };
  }
  return { url, pathname };
}
