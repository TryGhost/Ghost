import { FETCH_PATH_MAX_LENGTH } from './fetch.ts';
import { isContainedPath } from './paths.ts';

// A separator written as an escape is one segment to the URL parser and possibly two to
// whatever decodes it next.
const ENCODED_SEPARATOR = /%2f|%5c/i;

/**
 * Resolves the path an app passes to `fetch` against the Admin API root, such as
 * `https://site.example/ghost/api/admin/`, and returns the URL only if it stays under that
 * root on the root's own origin. Anything else comes back `null`: absolute and
 * protocol-relative URLs, backslashes, `..` in any spelling the URL parser understands, and
 * escaped separators.
 *
 * A leading `/` means the API root, not the origin, so `/posts/?limit=5` is
 * `https://site.example/ghost/api/admin/posts/?limit=5`. A path that does not start with one
 * is refused, so there is only one way to write each request.
 *
 * Check what comes back with `isBlockedAdminApiPath` too: staying under the root says the
 * request is for the Admin API, not that an app may make it.
 */
export function resolveAdminApiPath(path: string, apiRoot: URL): URL | null {
  if (typeof path !== 'string' || path.length > FETCH_PATH_MAX_LENGTH || !isContainedPath(path)) {
    return null;
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
    return null;
  }
  return url;
}
