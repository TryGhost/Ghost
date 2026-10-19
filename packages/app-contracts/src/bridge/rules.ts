/**
 * The bridge's rules that have no dependencies. The root entry point exports them so the SDK
 * can use them without zod. The schemas in this folder build on them, so the SDK and Admin
 * read a path or a refusal the same way.
 *
 * What Admin sends the page has no schema, because Admin builds it and never parses it. Its
 * types are declared here, next to the guards the SDK checks it with. The SDK trusts Admin, so
 * the guards only check shape and path containment. They turn a mismatch into a clear error
 * rather than `undefined` somewhere in the app. Only the schemas check limits.
 */

/** Posted by the app's page to `window.parent` once the SDK has loaded. */
export const HELLO_MESSAGE_TYPE = 'ghost-app:hello';

/** Posted by Admin to the frame that sent the hello, with the channel's port attached. */
export const CONNECT_MESSAGE_TYPE = 'ghost-app:connect';

/**
 * How long an app's page has to start, in milliseconds. Admin gives up on a frame this long
 * after mounting it, and the SDK waits this long for Admin to start the app unless the app
 * passes its own `timeout`. Long enough for a slow page on a slow connection to load and send
 * its hello.
 */
export const START_TIMEOUT_MS = 10_000;

/** Long enough for any real page title, short enough that Admin's own name still shows. */
export const TITLE_MAX_LENGTH = 200;

/**
 * The methods an app may use, in uppercase: the ones the allowlist has routes for. The SDK
 * uppercases what apps pass.
 */
export const FETCH_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;

export type FetchMethod = (typeof FETCH_METHODS)[number];

/**
 * Whether a request with this method may carry a body. Expects an uppercase method from
 * `FETCH_METHODS`. The Admin API reads no body on a `GET`, and fetch refuses to send one.
 */
export function methodAllowsBody(method: string): boolean {
  return method !== 'GET';
}

// The headers Admin sets itself on a request it makes for an app: the credentials, which only
// Admin may send; Admin's own markers, which Ghost core treats as coming from Admin; the headers
// that describe the connection, or the proxies along the way, rather than the request; and the
// ones that say how to read the body. A body is always JSON, which Admin labels itself: the Admin
// API also reads forms and uploads, and decodes JSON in any charset it's told, so a content type
// of the app's choosing could carry a write past the checks on what it contains.
const RESERVED_REQUEST_HEADER =
  /^(?:cookie|authorization|x-ghost-.*|app-pragma|host|origin|referer|content-length|content-type|content-encoding|x-forwarded-.*|forwarded|x-real-ip|via)$/i;

/**
 * Whether a request header is one that apps may not set, in any case. Admin refuses a request
 * that sets one rather than dropping the header, so the app gets an error instead of wondering
 * why the header never arrived. The browser refuses some of these anyway; they are listed here
 * so that none of them relies on the browser.
 */
export function isReservedRequestHeader(name: string): boolean {
  return RESERVED_REQUEST_HEADER.test(name);
}

/**
 * The messages Admin and the SDK use when they refuse an argument for the same reason, so an
 * app gets the same message whichever side catches the problem. The SDK checks only for obvious
 * mistakes, before anything crosses the channel; Admin's schemas check everything again.
 */
export const ARGUMENT_MESSAGES = {
  fetchPath: 'Expected an Admin API path such as /posts/, not a URL',
  fetchMethod: `Expected a method of: ${FETCH_METHODS.join(', ')}`,
  fetchBody: 'Expected no body on a GET request',
  // Header names are case-insensitive, and `Headers` lowercases them on the SDK's side, so the
  // name is lowercased here too and both sides produce the same message.
  reservedHeader: (name: string) =>
    `Expected no ${name.toLowerCase()} header, which only Admin sets`,
  jsonBody: 'Expected the body as JSON text',
  appPath: 'Expected a path within the app, starting with a single /',
  pathMove: 'Expected a move of push or replace',
  place:
    'Expected a place such as { post: { id } }, { page: { id } }, { member: { id } } or { apps: true }',
} as const;

/**
 * The statuses a `fetch` response may have. The SDK turns the response back into a
 * `Response`, which only accepts statuses from 200 to 599. Fetch never returns an
 * informational (1xx) status to scripts anyway.
 */
export const FETCH_RESPONSE_STATUS_MIN = 200;
export const FETCH_RESPONSE_STATUS_MAX = 599;

/**
 * The codes a refused call carries across the channel. The structured clone that carries an
 * error keeps only its message, so the refusing side puts the code at the start of the
 * message, as in `blocked: Apps can't use GET /db/`, and the other side parses it back out. Codes
 * are only ever added: an SDK that doesn't know a code treats the whole message as a generic
 * refusal.
 *
 * The host codes, which Admin refuses the page's calls with:
 *
 * - `session_ended`: the session is over; the page is about to be replaced.
 * - `invalid_argument`: an argument Admin does not take.
 * - `invalid_path`: a path that is not an Admin API path or a route within the app, or one
 *   the Admin API only responds to with a redirect, such as a path without its trailing `/`.
 * - `blocked`: a request the allowlist doesn't allow, or a write it refuses.
 * - `network_error`: Admin could not reach its own API.
 * - `rejected`: anything else; the detail says why.
 */
export const HOST_ERROR_CODES = [
  'session_ended',
  'invalid_argument',
  'invalid_path',
  'blocked',
  'network_error',
  'rejected',
] as const;

/** A code Admin may refuse a call from the page with. */
export type HostErrorCode = (typeof HOST_ERROR_CODES)[number];

/**
 * The app codes, which the page refuses Admin's calls with:
 *
 * - `invalid_context`: a start context the SDK cannot read, or a call before the app has
 *   started.
 * - `invalid_argument`: an argument the SDK does not take, such as a theme it cannot read.
 */
export const APP_ERROR_CODES = ['invalid_context', 'invalid_argument'] as const;

/** A code the page may refuse a call from Admin with. */
export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

/** Every code a refusal can carry, in either direction. */
export const BRIDGE_ERROR_CODES = [...HOST_ERROR_CODES, 'invalid_context'] as const;

export type BridgeErrorCode = (typeof BRIDGE_ERROR_CODES)[number];

const CODED_MESSAGE = /^([a-z_]+): ([\s\S]*)$/;

/**
 * Builds the message a refusal crosses the channel as: `code: detail`. Each side should pass
 * only its own codes; typing its refusals as `HostErrorCode` or `AppErrorCode` enforces that.
 */
export function encodeBridgeError(code: BridgeErrorCode, detail: string): string {
  return `${code}: ${detail}`;
}

/**
 * Reads the code and detail back from a refusal's `code: detail` message. Takes the codes the
 * other side may send: `HOST_ERROR_CODES` for a refusal from Admin, and `APP_ERROR_CODES` for
 * one from the page. Returns `undefined` for a message that doesn't start with one of them.
 */
export function decodeBridgeError<Code extends BridgeErrorCode>(
  message: string,
  codes: readonly Code[],
): { code: Code; detail: string } | undefined {
  const [, code = '', detail = ''] = CODED_MESSAGE.exec(message) ?? [];
  return (codes as readonly string[]).includes(code) ? { code: code as Code, detail } : undefined;
}

const THEME_MODES = ['light', 'dark'] as const;

/** The theme Admin is showing, so the page can match it. `mode` is resolved, never `system`. */
export type Theme = {
  mode: (typeof THEME_MODES)[number];
  accent_color: string;
};

/**
 * What Admin sends an app's page when the session starts. An older SDK ignores fields a newer
 * Admin adds rather than refusing them, so they don't stop it from starting.
 */
export type StartContext = {
  site: {
    url: string;
    title: string;
    timezone: string;
    locale: string;
  };
  /**
   * Who is using the app, by ID and role only. Name and email are left out on purpose: an
   * app that needs more about a person reads it from the API, through `/users/?filter=id:…`,
   * where app scopes will apply.
   */
  user: {
    id: string;
    role: string;
  };
  theme: Theme;
  /**
   * The installation's revision when this session started. Admin ends the session when the
   * installation's revision changes, so an app never runs against an unapproved revision.
   */
  session: {
    revision: number;
  };
  /**
   * The app's route, taken from Admin's URL, so a reload or a shared link opens the same page:
   * the path, query and fragment of the frame's URL on the app's origin. Admin loads a new
   * frame at it, so it's where the page already is, unless the page's server redirected it.
   */
  path: string;
};

// `Place` is written out rather than inferred from its schema, so the SDK's declarations, which
// include it, don't depend on zod. A test checks that it matches its schema.

/**
 * A place in Admin an app can send the publisher to: a post, a page or a member by its ID, or
 * the apps list.
 */
export type Place =
  | { post: { id: string } }
  | { page: { id: string } }
  | { member: { id: string } }
  | { apps: true };

/**
 * How Admin records an app's move in its history: as a new entry, or in place of the current
 * one. The SDK sets it from the call the app made, not the app.
 */
export type PathMove = 'push' | 'replace';

/** Admin's answer to a hello. The port travels in the message's transfer list, not its data. */
export type ConnectMessage = {
  type: typeof CONNECT_MESSAGE_TYPE;
  /**
   * The names of the calls this Admin exports, from `HostExports`, and of any newer argument
   * fields or places it accepts (see `HostExports` for the rule). An older Admin lacks the
   * newer ones, so the SDK rejects a call, field or place missing from this list as
   * `unsupported` without sending it.
   */
  exports: string[];
};

/**
 * The Admin API's response to `fetch`, as plain data so it can cross the channel, with a status
 * the SDK can build a `Response` from.
 */
export type FetchResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
};

// URL parsers and routers don't agree on whether to strip or refuse control characters, so a
// path containing one can mean something different to each of them.
const CONTROL_CHARACTER = /\p{Cc}/u;

/**
 * Whether a value is a path that stays within the base it is resolved against, rather than
 * escaping it. It must start with a single `/`, so it can't carry a scheme or be read as
 * `//host`. It must not contain `\`, which URL parsers read as `/`, or any control character.
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

// Used only as a base for parsing, never requested. Parsing against it gives a path the URL
// parser's normalised form.
const APP_PATH_BASE = 'https://app.invalid';

/**
 * Returns an app path in the URL parser's normalised form, the one form Admin and the SDK
 * store it in. `.` and `..` are resolved within the app, so a path can never climb out of it.
 * Characters that need escaping are escaped once, so a path the app reported compares equal to
 * the same path read back from Admin's URL. `/search?q=a b` becomes `/search?q=a%20b`, and
 * `/x/../episodes/1` becomes `/episodes/1`.
 *
 * Expects a path that `isContainedPath` accepts; anything else may not be a path within the
 * app at all. `AppPathSchema` already returns this form, so Admin never calls this directly.
 * The SDK, which doesn't load zod, does.
 */
export function normaliseAppPath(path: string): string {
  const url = new URL(path, APP_PATH_BASE);
  return `${url.pathname}${url.search}${url.hash}`;
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
  return (
    isRecord(value) &&
    value.type === CONNECT_MESSAGE_TYPE &&
    Array.isArray(value.exports) &&
    value.exports.every((name) => typeof name === 'string')
  );
}

export function isFetchResponse(value: unknown): value is FetchResponse {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.status) &&
    (value.status as number) >= FETCH_RESPONSE_STATUS_MIN &&
    (value.status as number) <= FETCH_RESPONSE_STATUS_MAX &&
    typeof value.statusText === 'string' &&
    isRecord(value.headers) &&
    !Array.isArray(value.headers) &&
    Object.values(value.headers).every((header) => typeof header === 'string') &&
    typeof value.body === 'string'
  );
}
