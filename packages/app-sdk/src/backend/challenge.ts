import { CHALLENGE_PATH, answerChallenge } from '@tryghost/app-contracts/identity';

import { json, readText } from './body.ts';

export { CHALLENGE_PATH };

/**
 * The backend key's private half: a JWK object, or its JSON as it sits in a secret or an
 * environment variable, such as `GHOST_APP_BACKEND_KEY`.
 */
export type BackendKey = JsonWebKey | string;

export interface HandleChallengeOptions {
  backendKey: BackendKey;
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
  const { kty, crv, x, d } = (typeof jwk === 'object' && jwk !== null ? jwk : {}) as JsonWebKey;
  if (kty !== 'OKP' || crv !== 'Ed25519' || typeof x !== 'string' || typeof d !== 'string') {
    throw new TypeError(INVALID_KEY);
  }
  try {
    return await crypto.subtle.importKey('jwk', { kty, crv, x, d }, { name: 'Ed25519' }, false, [
      'sign',
    ]);
  } catch (error) {
    throw new TypeError(INVALID_KEY, { cause: error });
  }
}

/**
 * Answers Ghost's challenge, which Ghost posts to `CHALLENGE_PATH` on the app's origin, by
 * signing it with the backend key. Route only that path's requests to it.
 *
 * It refuses a challenge for any origin but the one in `request.url`, as the platform reports
 * it. So pass the request as the platform hands it over, never one rebuilt from
 * `X-Forwarded-Host` or another header the sender sets.
 *
 * - `405` for any method but `POST`;
 * - `413` for a body larger than 4 KB;
 * - `400`, with `{ error }`, for anything that isn't a challenge for this origin;
 * - `200`, with `{ signature }`, the answer.
 *
 * A `backendKey` that isn't a private Ed25519 key throws a `TypeError`, so the platform
 * reports the misconfiguration as a server error.
 */
export async function handleChallenge(
  request: Request,
  { backendKey }: HandleChallengeOptions,
): Promise<Response> {
  if (request.method !== 'POST') {
    return json(405, { error: 'Expected a POST' }, { allow: 'POST' });
  }
  let body: string | undefined;
  try {
    body = await readText(request, CHALLENGE_MAX_BYTES);
  } catch {
    return json(400, { error: 'Expected a challenge in UTF-8' });
  }
  if (body === undefined) {
    return json(413, { error: `Expected a challenge of at most ${CHALLENGE_MAX_BYTES} bytes` });
  }
  const key = await importBackendKey(backendKey);
  const result = await answerChallenge(body, { backendKey: key, requestUrl: request.url });
  if (!result.success) {
    return json(400, { error: result.error });
  }
  return json(200, result.answer);
}
