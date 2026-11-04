import {
  challengeUrl,
  createChallenge,
  readSignedManifest,
  verifyChallengeAnswer,
  verifySignedManifest,
} from '@tryghost/app-contracts/identity';
import { parseManifest, parseManifestUrl } from '@tryghost/app-contracts/manifest';

import { readBytes } from '../shared/body.ts';
import { UNKNOWN_GHOST_URL, formatErrors } from '../shared/manifest.ts';
import { parseJsonText } from '../shared/parse.ts';
import type { PublicKeyJwk } from './keys.ts';
import {
  ANSWER_MAX_BYTES,
  MANIFEST_MAX_BYTES,
  MAX_REDIRECTS,
  SIGNED_MANIFEST_MAX_BYTES,
  TIMEOUT_MS,
  storedSize,
  tooLargeMessage,
} from './limits.ts';
import type { AppManifest, ManifestError } from './types.ts';

// Ghost's Got client follows these, and treats any other status as an answer.
const REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);

/** The codes Ghost refuses an app with, which `checkApp` reports the same problems with. */
export type CheckCode =
  | 'APP_MANIFEST_URL_INVALID'
  | 'APP_MANIFEST_UNREACHABLE'
  | 'APP_MANIFEST_REDIRECTED'
  | 'APP_MANIFEST_TOO_LARGE'
  | 'APP_MANIFEST_NOT_JSON'
  | 'APP_MANIFEST_UNSIGNED'
  | 'APP_MANIFEST_URL_MISMATCH'
  | 'APP_MANIFEST_INVALID'
  | 'APP_MANIFEST_SIGNATURE_INVALID'
  | 'APP_CHALLENGE_UNREACHABLE'
  | 'APP_CHALLENGE_FAILED';

export type CheckResult =
  | {
      success: true;
      manifestUrl: string;
      /** The manifest as Ghost parses it, with every path resolved. */
      manifest: AppManifest;
    }
  | {
      success: false;
      code: CheckCode;
      /** Ghost's own message for the code. */
      message: string;
      /** What exactly was wrong. Unlike Ghost, it says why a request failed. */
      detail: string;
      /** For `APP_MANIFEST_INVALID`, each problem by the path to its field. */
      errors?: ManifestError[];
    };

export interface CheckOptions {
  /** The fetch to make requests with. Node's own, by default. */
  fetch?: typeof fetch;
}

const MESSAGES: Record<CheckCode, string> = {
  APP_MANIFEST_URL_INVALID: 'The app manifest URL is not valid.',
  APP_MANIFEST_UNREACHABLE: 'Could not load the app’s manifest.',
  APP_MANIFEST_REDIRECTED: 'The app’s manifest redirects to another host.',
  APP_MANIFEST_TOO_LARGE: `The app’s manifest is larger than ${MANIFEST_MAX_BYTES / 1024} KB.`,
  APP_MANIFEST_NOT_JSON: 'The app’s manifest is not JSON.',
  APP_MANIFEST_UNSIGNED: 'The app’s manifest is not signed.',
  APP_MANIFEST_URL_MISMATCH: 'The app’s manifest is for another address.',
  APP_MANIFEST_INVALID: 'The app manifest is not valid.',
  APP_MANIFEST_SIGNATURE_INVALID: 'The app’s manifest signature is not valid.',
  APP_CHALLENGE_UNREACHABLE: 'Could not reach the app to confirm it comes from its developer.',
  APP_CHALLENGE_FAILED: 'Ghost couldn’t confirm the app comes from its developer.',
};

class Failure extends Error {
  constructor(
    readonly code: CheckCode,
    readonly detail: string,
    readonly errors?: ManifestError[],
  ) {
    super(MESSAGES[code]);
  }
}

interface Answer {
  status: number;
  location: string | null;
  /** Up to the limit; `undefined` past it, or when it wasn't wanted. */
  body: Uint8Array | undefined;
}

// Decoded as UTF-8, which is what JSON should use, whatever charset the app names, as in Ghost.
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

const describe = (error: unknown) => {
  const { message, cause } = error as {
    message?: string;
    cause?: { code?: string; message?: string };
  };
  const reason = cause?.code ?? cause?.message;
  return reason ? `${message} (${reason})` : String(message ?? error);
};

/**
 * Requests a URL as Ghost does, following no redirect, and reads the answer's body up to
 * `maxBytes`, until `signal` gives up, if `wantsBody` says so from its status. Any other body is
 * dropped unread, as Ghost drops a redirect's, so one that stalls or breaks doesn't matter. A
 * request that fails, before or while a body it wants arrives, fails with `code`.
 */
async function send(
  request: typeof fetch,
  url: URL | string,
  init: RequestInit & { signal: AbortSignal },
  {
    maxBytes,
    code,
    wantsBody,
  }: { maxBytes: number; code: CheckCode; wantsBody: (status: number) => boolean },
): Promise<Answer> {
  try {
    const response = await request(url, { ...init, redirect: 'manual' });
    const answer = { status: response.status, location: response.headers.get('location') };
    if (!wantsBody(response.status)) {
      response.body?.cancel().catch(() => undefined);
      return { ...answer, body: undefined };
    }
    return { ...answer, body: await readBytes(response, maxBytes) };
  } catch (error) {
    throw new Failure(code, `${String(url)}: ${describe(error)}`);
  }
}

const isRedirect = (status: number) => status >= 300 && status < 400;
const isSuccess = (status: number) => status >= 200 && status < 300;

/** A redirect may stay on the host it started on, or move it from HTTP to HTTPS, as in Ghost. */
function staysOnHost(from: URL, to: URL): boolean {
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

/** The signed manifest's bytes, following redirects on the same host, as Ghost does. */
async function fetchManifest(manifestUrl: string, request: typeof fetch): Promise<Uint8Array> {
  let current = new URL(manifestUrl);
  // One deadline for the whole read, redirects included, as in Ghost, so a slow app can't stall
  // it several times over.
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let hops = 0; ; hops++) {
    const answer = await send(
      request,
      current,
      { headers: { accept: 'application/json' }, signal },
      {
        maxBytes: SIGNED_MANIFEST_MAX_BYTES,
        code: 'APP_MANIFEST_UNREACHABLE',
        wantsBody: isSuccess,
      },
    );
    if (REDIRECT_STATUSES.has(answer.status) && answer.location !== null) {
      const target = URL.parse(answer.location, current);
      if (!target) {
        throw new Failure(
          'APP_MANIFEST_UNREACHABLE',
          `${manifestUrl} answered with HTTP ${answer.status} and a Location that is not a URL`,
        );
      }
      if (!staysOnHost(current, target)) {
        throw new Failure('APP_MANIFEST_REDIRECTED', `${manifestUrl} redirects to ${target.host}`);
      }
      if (hops === MAX_REDIRECTS) {
        throw new Failure(
          'APP_MANIFEST_UNREACHABLE',
          `${manifestUrl} redirects more than ${MAX_REDIRECTS} times`,
        );
      }
      current = target;
      continue;
    }
    if (!isSuccess(answer.status)) {
      throw new Failure(
        'APP_MANIFEST_UNREACHABLE',
        `${current.href} answered with HTTP ${answer.status}`,
      );
    }
    if (!answer.body) {
      throw new Failure('APP_MANIFEST_TOO_LARGE', manifestUrl);
    }
    return answer.body;
  }
}

function parseJson(text: string, what: string): unknown {
  try {
    return parseJsonText(text);
  } catch {
    throw new Failure('APP_MANIFEST_NOT_JSON', what);
  }
}

async function challenge(origin: string, backendKey: PublicKeyJwk, request: typeof fetch) {
  const sent = createChallenge(origin);
  const answer = await send(
    request,
    challengeUrl(origin),
    {
      method: 'POST',
      body: sent,
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
    // The answer, or the backend's explanation of a refusal.
    { maxBytes: ANSWER_MAX_BYTES, code: 'APP_CHALLENGE_UNREACHABLE', wantsBody: () => true },
  );
  const text = answer.body && decode(answer.body);
  if (!isSuccess(answer.status)) {
    // The backend's own explanation, such as handleChallenge's, if it's short.
    const said = text && text.length < 500 ? `: ${text.trim()}` : '';
    const redirect = isRedirect(answer.status)
      ? ' (Ghost follows no redirect for a challenge)'
      : '';
    throw new Failure(
      'APP_CHALLENGE_UNREACHABLE',
      `${origin} answered the challenge with HTTP ${answer.status}${redirect}${said}`,
    );
  }
  if (text === undefined) {
    throw new Failure(
      'APP_CHALLENGE_FAILED',
      `${origin}: The answer is larger than ${ANSWER_MAX_BYTES / 1024} KB`,
    );
  }
  const verified = await verifyChallengeAnswer(sent, text, backendKey);
  if (!verified.success) {
    throw new Failure('APP_CHALLENGE_FAILED', `${origin}: ${verified.error}`);
  }
}

async function check(input: string, request: typeof fetch): Promise<CheckResult> {
  const address = parseManifestUrl(input, true);
  if (!address.success) {
    throw new Failure('APP_MANIFEST_URL_INVALID', address.error);
  }
  const { manifestUrl } = address;

  const body = await fetchManifest(manifestUrl, request);
  const signed = readSignedManifest(parseJson(decode(body), manifestUrl));
  if (!signed.success) {
    throw new Failure('APP_MANIFEST_UNSIGNED', signed.error);
  }
  const parsed = parseManifest(parseJson(signed.payload, manifestUrl), {
    manifestUrl,
    ghostUrls: [UNKNOWN_GHOST_URL],
    allowLocalhost: true,
  });
  if (!parsed.success) {
    const detail = formatErrors(parsed.errors, '; ');
    if (parsed.reason === 'manifest_url_mismatch') {
      throw new Failure('APP_MANIFEST_URL_MISMATCH', detail);
    }
    throw new Failure('APP_MANIFEST_INVALID', detail, parsed.errors);
  }
  const { manifest } = parsed;
  const verified = await verifySignedManifest(signed.signed, manifest.identity_key);
  if (!verified.success) {
    throw new Failure('APP_MANIFEST_SIGNATURE_INVALID', verified.error);
  }
  // Ghost measures what it stores, with the paths resolved, after verifying the signature.
  if (storedSize(manifest) > MANIFEST_MAX_BYTES) {
    throw new Failure('APP_MANIFEST_TOO_LARGE', `${manifestUrl}: ${tooLargeMessage()}`);
  }
  await challenge(new URL(manifestUrl).origin, manifest.backend_key, request);
  return { success: true, manifestUrl, manifest };
}

/**
 * Checks an app as Ghost does before installing it: fetches the signed manifest from its
 * manifest URL, verifies its signature with the identity key it names, parses the manifest
 * against that URL, and challenges the app's origin, verifying the answer with the backend
 * key. A failure carries the code Ghost would refuse the app with.
 *
 * It always sends the challenge, even to localhost, which Ghost in development skips, so a
 * backend is checked before it's deployed. What it can't check is what only a site knows:
 * that nothing in the manifest is on the site's own origin, that the app is signed with the key
 * the site installed it with, and that its backend key isn't one a newer manifest replaced.
 */
export async function checkApp(
  manifestUrl: string,
  { fetch: request = globalThis.fetch }: CheckOptions = {},
): Promise<CheckResult> {
  try {
    return await check(manifestUrl, request);
  } catch (error) {
    if (error instanceof Failure) {
      return {
        success: false,
        code: error.code,
        message: error.message,
        detail: error.detail,
        ...(error.errors ? { errors: error.errors } : {}),
      };
    }
    throw error;
  }
}
