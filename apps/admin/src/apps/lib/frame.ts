import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';

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
 * bridge (BER-3983).
 */
export const APP_FRAME_SANDBOX = 'allow-scripts allow-same-origin allow-forms';

/**
 * Which browser features the frame gets: none. Features that default to the frame's own
 * origin are already off for a cross-origin frame; these are the ones that default to on.
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

/** The URL of the page the app shows in Admin. */
export function appPageUrl(manifest: AppManifest): string {
  const page =
    manifest.surfaces.find((surface) => surface.type === 'admin_page') ?? manifest.surfaces[0];
  return page.url;
}
