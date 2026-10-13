/**
 * How long an app's page gets, from the frame's mount, to say hello and start before Admin
 * calls it unresponsive. Settable so acceptance specs don't wait it out.
 */
export const appFrameTimeouts = { ready: 10_000 };

/**
 * What the app's frame may do. The app runs on its own origin, checked when it was
 * installed to differ from Admin's, so with `allow-same-origin` the sandbox keeps it on
 * that origin rather than making it opaque. No popups and no top navigation: an app stays
 * in its frame and can't take the publisher elsewhere; it asks Admin to, over the bridge,
 * for the places Admin offers. No modals either, on purpose: `alert`, `confirm` and
 * `prompt` would be the browser's dialogs over Ghost's page, indistinguishable from
 * Ghost's own, so an app brings its own dialogs. In the frame they return at once,
 * `confirm` with false.
 */
export const APP_FRAME_SANDBOX = 'allow-scripts allow-same-origin allow-forms';

/**
 * Features that default to the top document's own origin. Being cross-origin already
 * keeps them from the frame; they're listed so that granting one is a deliberate change
 * here, with the app's origin, rather than an omission.
 */
const SELF_BY_DEFAULT = [
  'autoplay',
  'camera',
  'display-capture',
  'fullscreen',
  'geolocation',
  'microphone',
  'midi',
  'payment',
  'publickey-credentials-get',
  'screen-wake-lock',
  'usb',
  'web-share',
];

/**
 * Features that default to every origin, so a cross-origin frame has them unless they're
 * refused here: the advertising and measurement APIs, cross-site storage, synchronous XHR
 * and hardware the sandbox doesn't cover. Chromium's list, as of 152; the others have fewer.
 */
const EVERYONE_BY_DEFAULT = [
  'attribution-reporting',
  'browsing-topics',
  'gamepad',
  'join-ad-interest-group',
  'picture-in-picture',
  'private-aggregation',
  'private-state-token-issuance',
  'private-state-token-redemption',
  'run-ad-auction',
  'shared-storage',
  'shared-storage-select-url',
  'storage-access',
  'sync-xhr',
  'unload',
];

/** Which browser features the frame gets: none. */
export const APP_FRAME_ALLOW = [...SELF_BY_DEFAULT, ...EVERYONE_BY_DEFAULT]
  .map((feature) => `${feature} 'none'`)
  .join('; ');

/**
 * Whether a page is on an origin Ghost itself is served from. Ghost refuses such a URL
 * when it accepts a manifest, but the site's or Admin's URL can change afterwards, and a
 * frame on Admin's own origin would be Admin, sandbox or not. So the same rule is asked
 * again where the frame is made, against the origins Admin knows itself by.
 *
 * It covers the URL the frame is given, not where the frame goes from there: the app's
 * server can redirect, and the page can set its own location, which the sandbox allows.
 * What would load then is Ghost's own content, so the gap is small, but it's a gap.
 * The bridge resolves it: Admin only answers a hello whose `event.origin` is the surface's
 * origin, so a frame that redirected or navigated to Ghost's own origin can never complete
 * the handshake and ends up not-responding.
 */
export { isGhostOrigin } from '@tryghost/app-contracts';
