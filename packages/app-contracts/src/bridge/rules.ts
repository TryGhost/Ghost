/**
 * The bridge's rules that depend on nothing, exported from the root entry point so the SDK can
 * use them without zod. The schemas in this folder build on them, so a path or a refusal means
 * the same thing to the SDK as to Admin.
 *
 * What Admin sends the page has no schema, as Admin builds it and never parses it; its types
 * are declared here beside the guards the SDK checks it with. The SDK trusts Admin, so the
 * guards check shape and path containment, turning a mismatch into a clear error rather than
 * `undefined` somewhere in the app. Limits are left to the schemas.
 */

/** Posted by the app's page to `window.parent` once the SDK has loaded. */
export const HELLO_MESSAGE_TYPE = 'ghost-app:hello';

/** Posted by Admin to the frame that said hello, with the channel's port attached. */
export const CONNECT_MESSAGE_TYPE = 'ghost-app:connect';

/**
 * How long an app's page has to start, in milliseconds: Admin gives up on a frame this long
 * after mounting it, and the SDK waits this long for Admin to start it unless the app says
 * otherwise. Long enough for a slow page on a slow connection to load and say hello.
 */
export const START_TIMEOUT_MS = 10_000;

/** Long enough for any real page title, short enough that Admin's own name still shows. */
export const TITLE_MAX_LENGTH = 200;

/** The methods the Admin API answers. Written in uppercase; the SDK normalises what apps pass. */
export const FETCH_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] as const;

export type FetchMethod = (typeof FETCH_METHODS)[number];

/**
 * Whether a request with this method may carry a body. Written for the uppercase methods in
 * `FETCH_METHODS`: the Admin API reads no body on a `GET` or `HEAD`, and fetch refuses one.
 */
export function methodAllowsBody(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD';
}

// The headers Admin sets itself on a request it makes for an app: the credentials, which are
// Admin's to send; Admin's own markers, which Ghost reads as Admin speaking; and the ones that
// describe the connection, or the proxies on the way, rather than the request.
const RESERVED_REQUEST_HEADER =
  /^(?:cookie|authorization|x-ghost-.*|app-pragma|host|origin|referer|content-length|x-forwarded-.*|forwarded|x-real-ip|via)$/i;

/**
 * Whether an app may not set a request header, whatever its case. Admin refuses a request that
 * sets one rather than dropping it, so an app learns it cannot rather than wondering why the
 * header never arrived. The browser refuses some of these anyway; they are named so none of
 * them depends on that.
 */
export function isReservedRequestHeader(name: string): boolean {
  return RESERVED_REQUEST_HEADER.test(name);
}

const MULTIPART = /^\s*multipart\//i;

/**
 * Whether a request's content type is multipart, as an upload's is. Files stay out of the
 * bridge for now, and a body is text, but an app could write a multipart body as text and
 * reach an upload route, so a multipart content type is refused whatever the body.
 */
export function isMultipartContentType(value: string): boolean {
  return MULTIPART.test(value);
}

/**
 * What Admin and the SDK say when they refuse an argument for the same reason, so an app hears
 * the same words whichever of them catches it. The SDK checks only what is plainly wrong, before
 * anything crosses the channel; Admin's schemas check everything again.
 */
export const ARGUMENT_MESSAGES = {
  fetchPath: 'Expected an Admin API path such as /posts/, not a URL',
  fetchMethod: `Expected a method of: ${FETCH_METHODS.join(', ')}`,
  fetchBody: 'Expected no body on a GET or HEAD request',
  // Header names are compared in any case, and `Headers` lowercases them on the SDK's side,
  // so the name is lowercased here for both sides to say the same.
  reservedHeader: (name: string) =>
    `Expected no ${name.toLowerCase()} header, which only Admin sets`,
  multipart: "Expected a content type other than multipart/*: apps can't upload files yet",
  appPath: 'Expected a path within the app, starting with a single /',
  pathChangeOptions: 'Expected options such as { replace: true }',
  place:
    'Expected a place such as { post: { id } }, { page: { id } }, { member: { id } } or { apps: true }',
} as const;

/**
 * The statuses an answer to `fetch` may have. The SDK turns it back into a `Response`, which
 * only accepts statuses from 200 to 599; fetch never hands script an informational one.
 */
export const FETCH_RESPONSE_STATUS_MIN = 200;
export const FETCH_RESPONSE_STATUS_MAX = 599;

/**
 * The codes a refused call carries across the channel. Only an error's message survives the
 * structured clone that carries it, so the side that refuses leads the message with the code,
 * as `blocked: Apps can't use /db/`, and the other side reads it back. Codes are only ever
 * added: an SDK that does not know one reads the whole message as a refusal.
 *
 * Admin refuses the page's calls with these, the host codes:
 *
 * - `session_ended`: the session is over; the page is about to be replaced.
 * - `invalid_argument`: an argument Admin does not take.
 * - `invalid_path`: a path that is not an Admin API path or a route within the app, or one
 *   the Admin API answers only with a redirect, such as a path without its trailing `/`.
 * - `blocked`: an Admin API route apps may not reach.
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
 * The page refuses Admin's calls with these, the app codes:
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
 * The message a refusal crosses the channel as: `code: detail`. Each side passes only its
 * own codes; typing its refusals as `HostErrorCode` or `AppErrorCode` keeps it to them.
 */
export function encodeBridgeError(code: BridgeErrorCode, detail: string): string {
  return `${code}: ${detail}`;
}

/**
 * The code and detail a refusal's message carries, read back from `code: detail`. Takes the
 * codes the other side may send, `HOST_ERROR_CODES` for a refusal from Admin and
 * `APP_ERROR_CODES` for one from the page, and answers `undefined` for a message that leads
 * with none of them.
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
 * What Admin tells an app's page when the session starts. Fields a newer Admin adds are
 * ignored rather than refused, so they do not stop an older SDK from starting.
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
   * app that needs more about a person asks the API, through `/users/?filter=id:…`, where
   * app scopes will apply.
   */
  user: {
    id: string;
    role: string;
  };
  theme: Theme;
  /**
   * The installation revision this session was started against. Admin ends the session when
   * the installation moves on, so an app never runs against a revision nobody approved.
   */
  session: {
    revision: number;
  };
  /**
   * The app's own route, from Admin's address, so a reload or a shared link lands on the
   * same page. `/` when Admin's address names none.
   */
  path: string;
};

/**
 * A place in Admin an app can send the publisher to, by name. Written out here rather than
 * inferred from `PlaceSchema`, so the SDK's types carry no zod; a test holds the two equal.
 */
export type Place =
  | { post: { id: string } }
  | { page: { id: string } }
  | { member: { id: string } }
  | { apps: true };

/** How Admin records an app's new path in its history. Held equal to `PathChangeOptionsSchema`. */
export type PathChangeOptions = {
  replace?: boolean | undefined;
};

/** Admin's answer to a hello. The port travels in the message's transfer list, not its data. */
export type ConnectMessage = {
  type: typeof CONNECT_MESSAGE_TYPE;
  /**
   * The names of the calls this Admin exports, its `HostExports`. An older Admin lacks the
   * newer ones, so the SDK refuses a call missing here as `unsupported` without making it.
   */
  exports: string[];
};

/**
 * The Admin API's answer to `fetch`, as plain data so it can cross the channel, with a status
 * the SDK can build a `Response` from.
 */
export type FetchResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
};

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

// Only parsed against, never requested: it gives a path the URL parser's own spelling.
const APP_PATH_BASE = 'https://app.invalid';

/**
 * An app path as the URL parser spells it, the one spelling Admin and the SDK keep it in: `.`
 * and `..` resolved within the app, so a path can never climb out of it, and what needs
 * escaping escaped once, so a path the app reported and the same path read back from Admin's
 * address compare equal. `/search?q=a b` becomes `/search?q=a%20b`, and `/x/../episodes/1`
 * becomes `/episodes/1`.
 *
 * Takes a path `isContainedPath` accepts; anything else may not be a path within the app at
 * all. `AppPathSchema` answers with this spelling, so Admin never calls it itself; the SDK,
 * which loads no zod, does.
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
    Object.values(value.headers).every((header) => typeof header === 'string') &&
    typeof value.body === 'string'
  );
}
