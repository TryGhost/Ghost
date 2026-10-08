/**
 * How long an app's page gets to load before Admin calls it unresponsive. Settable so
 * acceptance specs don't wait it out.
 */
export const appFrameTimeouts = { ready: 12_000 };

/**
 * What the app's frame may do. The app runs on its own origin, checked when it was
 * installed to differ from Admin's, so with `allow-same-origin` the sandbox keeps it on
 * that origin rather than making it opaque. No popups and no top navigation: an app stays
 * in its frame and can't take the publisher elsewhere. Moving around Admin comes with the
 * bridge (BER-3983). No modals either, on purpose: `alert`, `confirm` and `prompt` would
 * be the browser's dialogs over Ghost's page, indistinguishable from Ghost's own, so an
 * app brings its own dialogs. In the frame they return at once, `confirm` with false.
 */
export const APP_FRAME_SANDBOX = 'allow-scripts allow-same-origin allow-forms';

/**
 * Which browser features the frame gets: none. Being cross-origin is what keeps them off,
 * as each of these defaults to the top document's own origin; this list says so
 * explicitly, so a feature can only be granted here, on purpose, with the app's origin.
 */
export const APP_FRAME_ALLOW = [
  'autoplay',
  'camera',
  'display-capture',
  'fullscreen',
  'geolocation',
  'microphone',
  'midi',
  'payment',
  'picture-in-picture',
  'publickey-credentials-get',
  'screen-wake-lock',
  'usb',
  'web-share',
]
  .map((feature) => `${feature} 'none'`)
  .join('; ');

/**
 * Whether a page is on an origin Ghost itself is served from. Ghost refuses such a URL
 * when it accepts a manifest, but the site's or Admin's URL can change afterwards, and a
 * frame on Admin's own origin would be Admin, sandbox or not. So the check is made again
 * here, where the frame is made, against the origins Admin knows itself by.
 */
export function isGhostOrigin(pageUrl: string, ghostUrls: string[]): boolean {
  const origin = (value: string): string | null => {
    try {
      return new URL(value).origin;
    } catch {
      return null;
    }
  };
  const page = origin(pageUrl);
  return page === null || ghostUrls.some((url) => origin(url) === page);
}
