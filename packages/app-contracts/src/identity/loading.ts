// How Ghost reads an app: the limits it fetches a signed manifest and a challenge's answer
// with, the redirects it follows, and the codes and messages it refuses an app with. Ghost
// core reads apps by these, and the app SDK checks an app by them before Ghost does.

/** How long Ghost waits for each read from an app, redirects and body included. */
export const FETCH_TIMEOUT_MS = 5000;

/** How many redirects on the same host Ghost follows for a manifest. */
export const MAX_REDIRECTS = 3;

/** The redirect statuses Ghost's HTTP client follows. It treats any other status as an answer. */
export const REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);

/** The largest manifest Ghost stores, which it keeps in a TEXT column. */
export const MANIFEST_MAX_BYTES = 64 * 1024;

/**
 * The largest signed manifest Ghost reads: the manifest in base64url is a third larger, and
 * the header and signature are well under a kilobyte, so a manifest of the largest size
 * still fits.
 */
export const SIGNED_MANIFEST_MAX_BYTES = Math.ceil((MANIFEST_MAX_BYTES * 4) / 3) + 1024;

/** The largest answer to a challenge Ghost reads. */
export const ANSWER_MAX_BYTES = 4 * 1024;

export const isSuccess = (status: number) => status >= 200 && status < 300;

export const isRedirect = (status: number) => status >= 300 && status < 400;

/** A redirect may stay on the host it started on, or move it from HTTP to HTTPS. */
export function staysOnHost(from: URL, to: URL): boolean {
  if (to.origin === from.origin) {
    return true;
  }
  return (
    from.protocol === 'http:' &&
    to.protocol === 'https:' &&
    to.hostname === from.hostname &&
    from.port === '' &&
    to.port === ''
  );
}

/**
 * A Location header as the URL it names, resolved against `base`, or `null` if it isn't one.
 * Headers arrive as latin1, and Ghost reads a Location as UTF-8, as got and browsers do.
 */
export function readLocation(location: string, base: string | URL): URL | null {
  const bytes = Uint8Array.from(location, (char) => char.charCodeAt(0) & 0xff);
  return URL.parse(new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes), base);
}

/**
 * Drops the credentials from a URL Ghost requests, as browsers drop a Location's, so none are
 * ever sent or reported.
 */
export function dropCredentials(url: URL): URL {
  url.username = '';
  url.password = '';
  return url;
}

/** JSON text as Ghost reads it: a byte order mark is valid at its start, but JSON.parse refuses it. */
export function parseJsonText(text: string): unknown {
  return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
}

/**
 * Ghost's message for each code it refuses an app with while it loads the app's manifest and
 * checks its identity. Each refusal carries a context of its own that says what exactly was
 * wrong.
 */
export const APP_LOAD_MESSAGES = {
  APP_MANIFEST_URL_INVALID: 'The app manifest URL is not valid.',
  APP_MANIFEST_UNREACHABLE: 'Could not load the app’s manifest.',
  APP_MANIFEST_REDIRECTED: 'The app’s manifest redirects to another host.',
  APP_MANIFEST_TOO_LARGE: `The app’s manifest is larger than ${MANIFEST_MAX_BYTES / 1024} KB.`,
  APP_MANIFEST_NOT_JSON: 'The app’s manifest is not JSON.',
  APP_MANIFEST_UNSIGNED: 'The app’s manifest is not signed.',
  APP_MANIFEST_URL_MISMATCH: 'The app’s manifest is for another address.',
  APP_MANIFEST_INVALID: 'The app manifest is not valid.',
  APP_MANIFEST_SIGNATURE_INVALID: 'The app’s manifest signature is not valid.',
  APP_IDENTITY_MISMATCH: 'This app doesn’t come from the same developer as the installed one.',
  APP_BACKEND_KEY_RETIRED: 'Ghost couldn’t confirm the app comes from its developer.',
  APP_CHALLENGE_UNREACHABLE: 'Could not reach the app to confirm it comes from its developer.',
  APP_CHALLENGE_FAILED: 'Ghost couldn’t confirm the app comes from its developer.',
} as const satisfies Record<string, string>;

export type AppLoadCode = keyof typeof APP_LOAD_MESSAGES;

/** Why an answer to a challenge was refused for its size. */
export const ANSWER_TOO_LARGE = `The answer is larger than ${ANSWER_MAX_BYTES / 1024} KB`;
