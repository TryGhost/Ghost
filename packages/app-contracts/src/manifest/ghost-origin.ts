/**
 * Whether a URL is on an origin Ghost itself is served from: the site's, or Admin's. A
 * page there would be Ghost, not the app, whatever a frame's sandbox says. So Ghost refuses
 * such a URL when it accepts a manifest, and Admin asks again where it frames the page,
 * since the site's or Admin's address can change after an app is installed.
 *
 * Any doubt counts as Ghost's: a page URL that can't be parsed, a Ghost URL that can't be
 * parsed, or no Ghost URLs at all. Either way the page stays out of the frame.
 */
export function isGhostOrigin(url: string | URL, ghostUrls: Iterable<string | URL>): boolean {
  const origin = originOf(url);
  if (origin === null) {
    return true;
  }
  let known = false;
  for (const ghostUrl of ghostUrls) {
    const ghostOrigin = originOf(ghostUrl);
    if (ghostOrigin === null || ghostOrigin === origin) {
      return true;
    }
    known = true;
  }
  return !known;
}

function originOf(value: string | URL): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
