import { isContainedPath, isLocalhost } from '@tryghost/app-contracts';
import { SignJWT } from 'jose';

// An Admin API key as Ghost shows it for a custom integration: the key's ID, then its secret
// in hex.
const ADMIN_API_KEY = /^([0-9a-f]{24}):([0-9a-f]{64})$/;

// Ghost refuses a token issued more than 5 minutes ago, whatever its `exp`.
const TOKEN_LIFETIME_SECONDS = 5 * 60;

const INVALID_KEY =
  'Expected an Admin API key as Ghost shows it for a custom integration: <id>:<secret>';

function readKey(key: string): { id: string; secret: Uint8Array<ArrayBuffer> } {
  const match = ADMIN_API_KEY.exec(typeof key === 'string' ? key.trim() : '');
  if (!match) {
    // Never says what the key was: it's a secret.
    throw new TypeError(INVALID_KEY);
  }
  const [, id = '', hex = ''] = match;
  const secret = new Uint8Array(hex.length / 2);
  for (let i = 0; i < secret.length; i++) {
    secret[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return { id, secret };
}

export interface AdminApiTokenOptions {
  /** When the token is issued, in milliseconds since the epoch. Now, by default. */
  now?: number;
}

/**
 * A short-lived token for Ghost's Admin API, from a custom integration's Admin API key: an
 * HS256 JWT whose `kid` is the key's ID, for the audience `/admin/`, valid for 5 minutes. Send
 * it as `Authorization: Ghost <token>`. Make a new one for each request, or at least every few
 * minutes.
 */
export async function createAdminApiToken(
  key: string,
  { now = Date.now() }: AdminApiTokenOptions = {},
): Promise<string> {
  const { id, secret } = readKey(key);
  const iat = Math.floor(now / 1000);
  return new SignJWT()
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT', kid: id })
    .setIssuedAt(iat)
    .setExpirationTime(iat + TOKEN_LIFETIME_SECONDS)
    .setAudience('/admin/')
    .sign(secret);
}

export interface AdminApiClientOptions {
  /** The site's URL, such as `https://site.example`, or with its subdirectory. */
  url: string;
  /** A custom integration's Admin API key, `<id>:<secret>`. Keep it on the server. */
  key: string;
  /** The fetch to make requests with. The platform's own, by default. */
  fetch?: typeof fetch;
}

export interface AdminApiClient {
  /** The Admin API root every path resolves against, such as `https://site.example/ghost/api/admin/`. */
  readonly root: string;
  /**
   * Calls the Admin API as the integration. `path` is relative to the API root, such as
   * `/posts/?limit=5`, never a URL. It sets `Authorization` itself.
   */
  fetch(path: string, init?: RequestInit): Promise<Response>;
}

/**
 * A client for calling a site's Admin API from the app's backend, with an integration's Admin
 * API key. It's for the backend's own requests. Don't expose it as an endpoint that relays
 * whatever path a caller sends: the key can do anything the integration can.
 */
export function createAdminApiClient({
  url,
  key,
  fetch: request = globalThis.fetch,
}: AdminApiClientOptions): AdminApiClient {
  readKey(key);
  const site = URL.parse(url);
  // The key goes with every request, so it never crosses the network in the clear: plain HTTP
  // only reaches a Ghost on the same machine.
  if (
    !site ||
    !(site.protocol === 'https:' || (site.protocol === 'http:' && isLocalhost(site.hostname)))
  ) {
    throw new TypeError(
      `Expected the site's URL over https, such as https://site.example, or http on localhost, not ${url}`,
    );
  }
  site.search = '';
  site.hash = '';
  if (!site.pathname.endsWith('/')) {
    site.pathname = `${site.pathname}/`;
  }
  const root = new URL('ghost/api/admin/', site);

  return {
    root: root.href,
    async fetch(path, init = {}) {
      // As Admin resolves an app's paths: with a `.` in front, the path is always relative to
      // the root, so it can't name a scheme or a host, and only `..` could climb out.
      const target = isContainedPath(path) ? new URL(`.${path}`, root) : undefined;
      if (!target || target.origin !== root.origin || !target.pathname.startsWith(root.pathname)) {
        throw new TypeError(`Expected an Admin API path such as /posts/, not ${String(path)}`);
      }
      const headers = new Headers(init.headers);
      headers.set('authorization', `Ghost ${await createAdminApiToken(key)}`);
      return request(target, { ...init, headers });
    },
  };
}
