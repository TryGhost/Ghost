/**
 * Whether a URL is on an origin Ghost itself is served from: the site's, or Admin's. A
 * page there would be Ghost, not the app, whatever a frame's sandbox says. So Ghost refuses
 * such a URL when it accepts a manifest, and Admin asks again where it frames the page,
 * since the site's or Admin's address can change after an app is installed.
 *
 * A URL that can't be parsed counts as Ghost's, and a Ghost URL that can't be parsed
 * matches nothing: either doubt keeps the page out of the frame.
 */
export function isGhostOrigin(url: string | URL, ghostUrls: Iterable<string | URL>): boolean {
  const origin = originOf(url);
  if (origin === null) {
    return true;
  }
  for (const ghostUrl of ghostUrls) {
    if (originOf(ghostUrl) === origin) {
      return true;
    }
  }
  return false;
}

function originOf(value: string | URL): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
