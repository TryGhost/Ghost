import type { StartContext, Theme } from './context.ts';
import type { FetchResponse } from './fetch.ts';
import type { ConnectMessage } from './messages.ts';

/**
 * The bridge's rules that depend on nothing: the values both sides agree on, and guards for
 * the shapes Admin sends the app's page. The root entry point exports them, so the SDK carries
 * them to the page without zod. The schemas in this folder build on them, so a path, a theme
 * or a start context means the same thing to the SDK as to Admin.
 *
 * The guards are for what Admin sends, which the SDK trusts: they check shape, and that a path
 * stays within what it names, so a mistake shows up as a clear error rather than as
 * `undefined` somewhere in the app. Limits are left to the schemas, which Admin applies to
 * everything a frame sends it.
 */

/** Posted by the app's page to `window.parent` once the SDK has loaded. */
export const HELLO_MESSAGE_TYPE = 'ghost-app:hello';

/** Posted by Admin to the frame that said hello, with the channel's port attached. */
export const CONNECT_MESSAGE_TYPE = 'ghost-app:connect';

/** Long enough for any real page title, short enough that Admin's own name still shows. */
export const TITLE_MAX_LENGTH = 200;

/** The methods the Admin API answers. Written in uppercase; the SDK normalises what apps pass. */
export const FETCH_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] as const;

export type FetchMethod = (typeof FETCH_METHODS)[number];

/**
 * The statuses an answer to `fetch` may have. The SDK turns it back into a `Response`, which
 * only accepts statuses from 200 to 599; fetch never hands script an informational one.
 */
export const FETCH_RESPONSE_STATUS_MIN = 200;
export const FETCH_RESPONSE_STATUS_MAX = 599;

/** What Admin's theme can be. Resolved before it is sent, so never `system`. */
export const THEME_MODES = ['light', 'dark'] as const;

// Control characters are stripped or refused unevenly by URL parsers and routers, so a path
// holding one can mean something different to each of them.
const CONTROL_CHARACTER = /\p{Cc}/u;

/**
 * Whether a value is a path within something rather than a way out of it: it starts with a
 * single `/`, so it cannot carry a scheme or be read as `//host`, and it holds no `\`, which
 * URL parsers read as `/`, and no control character.
 */
export function isContainedPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !CONTROL_CHARACTER.test(value)
  );
}

/** An object, or an array: anything whose fields can be read. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasStrings(value: unknown, keys: readonly string[]): value is Record<string, string> {
  return isRecord(value) && keys.every((key) => typeof value[key] === 'string');
}

export function isTheme(value: unknown): value is Theme {
  return (
    hasStrings(value, ['accent_color']) && (THEME_MODES as readonly unknown[]).includes(value.mode)
  );
}

export function isStartContext(value: unknown): value is StartContext {
  return (
    isRecord(value) &&
    hasStrings(value.site, ['url', 'title', 'timezone', 'locale']) &&
    hasStrings(value.user, ['id', 'role']) &&
    isTheme(value.theme) &&
    isRecord(value.session) &&
    Number.isSafeInteger(value.session.revision) &&
    (value.session.revision as number) >= 0 &&
    isContainedPath(value.path)
  );
}

export function isConnectMessage(value: unknown): value is ConnectMessage {
  return isRecord(value) && value.type === CONNECT_MESSAGE_TYPE;
}

export function isFetchResponse(value: unknown): value is FetchResponse {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.status) &&
    (value.status as number) >= FETCH_RESPONSE_STATUS_MIN &&
    (value.status as number) <= FETCH_RESPONSE_STATUS_MAX &&
    typeof value.statusText === 'string' &&
    isRecord(value.headers) &&
    Object.values(value.headers).every((header) => typeof header === 'string') &&
    typeof value.body === 'string'
  );
}
