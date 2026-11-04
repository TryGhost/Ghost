/**
 * Whether a URL is on a host Ghost itself is served from: the site's, or Admin's, on any
 * port and over either scheme. A page on Ghost's origin would be Ghost, not the app,
 * whatever a frame's sandbox says. On another port it would be the app's, but browsers send
 * a host's cookies to every port on it, so the app's server would be sent the staff user's
 * session. So Ghost refuses a manifest URL on such a host, and Admin asks again where it
 * frames the page, since the site's or Admin's address can change after an app is
 * installed.
 *
 * Hosts are compared as the URL parser reads them, so case and IDN spellings agree, and
 * without a trailing dot. A sibling host, such as another subdomain of the site's, is not
 * Ghost's: the cookies Ghost sets are host-only. Nor is a name under Ghost's, such as
 * `my-app.localhost` next to `localhost`, or another name for the same machine, such as
 * `127.0.0.1`, which browsers treat as other hosts too.
 *
 * Any doubt counts as Ghost's: a URL that isn't http or https, a Ghost URL like that, or no
 * Ghost URLs at all. Either way the URL is refused.
 */
export function isGhostHost(url: string | URL, ghostUrls: Iterable<string | URL>): boolean {
  const host = hostOf(url);
  if (host === null) {
    return true;
  }
  let known = false;
  for (const ghostUrl of ghostUrls) {
    const ghostHost = hostOf(ghostUrl);
    if (ghostHost === null || ghostHost === host) {
      return true;
    }
    known = true;
  }
  return !known;
}

/** An http or https URL's host as `isGhostHost` compares it, or null for any other. */
export function hostOf(value: string | URL): string | null {
  let url: URL;
  // Admin runs this, and `URL.parse` is newer than the browsers Admin supports.
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null;
  }
  return url.hostname.replace(/\.+$/, '') || null;
}
