import { START_TIMEOUT_MS } from '@tryghost/app-contracts/bridge';

/**
 * How long an app's page has, from the frame's mount, to send its hello and start before Admin
 * treats it as unresponsive. This is the bridge's timeout, which the SDK uses too. Settable so
 * acceptance specs don't have to wait for it.
 */
export const appFrameTimeouts = { ready: START_TIMEOUT_MS };

/**
 * What the app's frame may do. The app runs on its own origin, checked when it was installed to
 * differ from Admin's, so with `allow-same-origin` the sandbox keeps it on that origin rather than
 * making it opaque. No popups and no top navigation: an app stays in its frame and can't take the
 * publisher elsewhere. Instead, it asks Admin over the bridge to open one of the places Admin
 * offers. No modals either, on purpose: `alert`, `confirm` and `prompt` would be the browser's
 * dialogs over Ghost's page, indistinguishable from Ghost's own, so an app brings its own dialogs.
 * In the frame they return at once, `confirm` with false.
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
 * A document from Admin's origin loaded that way, such as a post the app injected a script into, is
 * same-origin with Admin. It can reach `window.parent` and call the Admin API as the staff user,
 * bypassing the blocklist. The handshake only withholds the bridge from it, and Admin reloads the
 * app once it notices, after that script has already run. The fix belongs in Core, which can
 * sandbox what it serves into another origin's frame (BER-3992).
 */
export { isGhostOrigin } from '@tryghost/app-contracts';
