import { CHALLENGE_PATH, answerChallenge } from '@tryghost/app-contracts/identity';
import { base64url } from 'jose';

import { publicHalfOf } from '../shared/keys.ts';
import { parseOrigin } from '../shared/parse.ts';
import { json, readText } from './body.ts';

export { CHALLENGE_PATH };

/**
 * A JWK, with the members RFC 7517 and RFC 7518 name. It's the package's own, as the DOM's
 * `JsonWebKey` doesn't exist in a backend that types against Node without the DOM library, and
 * a type alias rather than an interface, so a DOM `JsonWebKey` or a jose `JWK` passes for it.
 */
export type BackendJwk = {
  alg?: string;
  crv?: string;
  d?: string;
  dp?: string;
  dq?: string;
  e?: string;
  ext?: boolean;
  k?: string;
  key_ops?: string[];
  kid?: string;
  kty?: string;
  n?: string;
  oth?: { d?: string; r?: string; t?: string }[];
  p?: string;
  q?: string;
  qi?: string;
  use?: string;
  x?: string;
  y?: string;
};

/**
 * The backend key's private half: a JWK object, or its JSON as it sits in a secret or an
 * environment variable, such as `GHOST_APP_BACKEND_KEY`.
 */
export type BackendKey = BackendJwk | string;

export interface HandleChallengeOptions {
  backendKey: BackendKey;
  /**
   * The app's public origin, such as `https://app.example.com`, for a server that doesn't see
   * the scheme and host Ghost reaches it at, as Node behind a proxy that terminates TLS sees
   * `http://`. Ghost challenges the public origin, so without it every challenge is refused.
   * Take it from the app's own configuration, never from a request's headers, which the sender
   * sets. Workers, and other platforms that report the public URL, don't need it.
   */
  origin?: string;
}

// Ghost's challenge is about 150 bytes. Anything much larger isn't one.
const CHALLENGE_MAX_BYTES = 4 * 1024;

const INVALID_KEY =
  'backendKey must be a private Ed25519 key as a JWK, with kty "OKP", crv "Ed25519", x and d';

// The last key imported, so a backend that answers with one key imports it once.
let imported: { text: string; key: Promise<CryptoKey> } | undefined;

function importBackendKey(backendKey: BackendKey): Promise<CryptoKey> {
  const text = typeof backendKey === 'string' ? backendKey : JSON.stringify(backendKey);
  if (imported?.text !== text) {
    const key = importPrivateKey(text);
    imported = { text, key };
    // A key that failed to import is tried again next time, so a fixed secret takes effect.
    key.catch(() => {
      if (imported?.key === key) {
        imported = undefined;
      }
    });
  }
  return imported.key;
}

async function importPrivateKey(text: string): Promise<CryptoKey> {
  let jwk: unknown;
  try {
    jwk = JSON.parse(text);
  } catch {
    // Never says what the text was: it's a secret.
    throw new TypeError(`${INVALID_KEY}; it isn't JSON`);
  }
  const { kty, crv, x, d } = (typeof jwk === 'object' && jwk !== null ? jwk : {}) as BackendJwk;
  if (kty !== 'OKP' || crv !== 'Ed25519' || typeof x !== 'string' || typeof d !== 'string') {
    throw new TypeError(INVALID_KEY);
  }
  try {
    if ((await publicHalfOf(base64url.decode(d))) === x) {
      return await crypto.subtle.importKey('jwk', { kty, crv, x, d }, { name: 'Ed25519' }, false, [
        'sign',
      ]);
    }
  } catch (error) {
    throw new TypeError(INVALID_KEY, { cause: error });
  }
  throw new TypeError('backendKey is invalid because its x and d are from different keys');
}

/**
 * Answers Ghost's challenge by signing it with the backend key. Route only `CHALLENGE_PATH`
 * to it, or use `withGhostApp`, which does.
 */
export async function handleChallenge(
  request: Request,
  { backendKey, origin }: HandleChallengeOptions,
): Promise<Response> {
  // A bad `origin` is the app's own misconfiguration, so it throws, and the platform reports a
  // server error, rather than every challenge being refused with a 400 that looks like Ghost's
  // fault.
  const publicOrigin = origin === undefined ? undefined : parseOrigin(origin);
  if (origin !== undefined && !publicOrigin) {
    throw new TypeError(
      `Expected origin to be the app's origin, such as https://app.example.com, not ${origin}`,
    );
  }

  // Ghost always POSTs the challenge.
  if (request.method !== 'POST') {
    return json(405, { error: 'Expected a POST' }, { allow: 'POST' });
  }

  // A challenge is about 150 bytes, so stop reading at 4 KB rather than buffer whatever a
  // sender streams.
  let body: string | undefined;
  try {
    body = await readText(request, CHALLENGE_MAX_BYTES);
  } catch {
    return json(400, { error: 'Expected a challenge in UTF-8' });
  }
  if (body === undefined) {
    return json(413, { error: `Expected a challenge of at most ${CHALLENGE_MAX_BYTES} bytes` });
  }

  // Imported once and cached. A `backendKey` that isn't a private Ed25519 key throws a
  // `TypeError`, a server error, for the same reason as a bad `origin`.
  const key = await importBackendKey(backendKey);

  // The challenge names the origin Ghost sent it to, and is answered only for this app's own:
  // the one the platform reports in `request.url`, or `origin` behind a proxy. Never one taken
  // from `X-Forwarded-Host` or another header the sender sets, or anyone could have this
  // backend sign a challenge meant for another app.
  const result = await answerChallenge(body, {
    backendKey: key,
    requestUrl: publicOrigin ?? request.url,
  });
  if (!result.success) {
    return json(400, { error: result.error });
  }

  // `{ signature }`: Ghost verifies it against the backend key the signed manifest names.
  return json(200, result.answer);
}
