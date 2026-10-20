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
 * making it opaque.
 *
 * Popups and downloads are allowed, so an app can open a page elsewhere (a sign-in with another
 * service, a preview) and hand the publisher a file. Without `allow-popups-to-escape-sandbox`, a
 * popup inherits this sandbox: it can't navigate Admin's tab, which it could otherwise reach through
 * `window.opener.parent`, or any other window. Top navigation stays out, so an app can't take the
 * publisher elsewhere itself; it asks Admin over the bridge to open one of the places Admin offers.
 * Letting a popup escape the sandbox, and asking the publisher before an app opens popups or
 * downloads, would come later through the manifest, with Permissions and auth.
 *
 * No modals, on purpose: `alert`, `confirm` and `prompt` would be the browser's dialogs over
 * Ghost's page, indistinguishable from Ghost's own, so an app brings its own dialogs. In the frame
 * they return at once, `confirm` with false.
 */
export const APP_FRAME_SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads';

/**
 * Features the app's page gets. `'src'` grants each one to the origin of the frame's `src`, the
 * app's own, so a page the frame is sent to on another origin doesn't get them.
 *
 * Web Share, so an app can offer the device's share sheet as any site can. Each share needs a tap
 * in the app, the publisher picks where it goes, and the app only learns whether they shared.
 */
const GRANTED = ['web-share'];

/**
 * Features that default to the top document's own origin. Being cross-origin already
 * keeps them from the frame; they're listed so that granting one is a deliberate change
 * to `GRANTED` rather than an omission.
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

/** Which browser features the frame gets: the granted ones, on the app's origin, and no others. */
export const APP_FRAME_ALLOW = [
  ...GRANTED.map((feature) => `${feature} 'src'`),
  ...[...SELF_BY_DEFAULT, ...EVERYONE_BY_DEFAULT].map((feature) => `${feature} 'none'`),
].join('; ');

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
 * bypassing the allowlist. The handshake only withholds the bridge from it, and Admin reloads the
 * app once it notices, after that script has already run. The fix belongs in Core, which can
 * sandbox what it serves into another origin's frame (BER-3992). That doesn't cover a popup, which
 * is a top-level document: the allowlist's checks on what a write may contain keep script out of
 * the site instead.
 */
export { isGhostOrigin } from '@tryghost/app-contracts';
