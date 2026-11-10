import {
  challengeUrl,
  createChallenge,
  readSignedManifest,
  verifyChallengeAnswer,
  verifySignedManifest,
} from '@tryghost/app-contracts/identity';
import { parseManifest, parseManifestUrl } from '@tryghost/app-contracts/manifest';

import { readBytes } from '../shared/body.ts';
import { ignoreError } from '../shared/ignore.ts';
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

/** What `checkApp` resolves with: the manifest Ghost would install, or why Ghost would refuse. */
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

type Fetch = typeof fetch;

// Ghost's own message for each code.
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

/** Thrown by any step, and turned into a failed `CheckResult` by `checkApp`. */
class Failure extends Error {
  constructor(
    readonly code: CheckCode,
    readonly detail: string,
    readonly errors?: ManifestError[],
  ) {
    super(MESSAGES[code]);
  }
}

/**
 * Checks an app as Ghost does before installing it, and resolves with the code Ghost would
 * refuse it with, or the manifest Ghost would install.
 */
export async function checkApp(
  manifestUrl: string,
  { fetch: fetchFn = globalThis.fetch }: CheckOptions = {},
): Promise<CheckResult> {
  try {
    return await runChecks(manifestUrl, fetchFn);
  } catch (error) {
    if (!(error instanceof Failure)) {
      throw error;
    }
    return {
      success: false,
      code: error.code,
      message: error.message,
      detail: error.detail,
      ...(error.errors ? { errors: error.errors } : {}),
    };
  }
}

// The steps run in the order Ghost runs them, so the first failure is the one Ghost would report.
// Some things only a site knows can't be checked: Ghost's own hosts, the identity key the site
// installed the app with, and backend keys a newer manifest replaced.
async function runChecks(input: string, fetchFn: Fetch): Promise<CheckResult> {
  const manifestUrl = readManifestUrl(input);
  const body = await fetchManifest(manifestUrl, fetchFn);
  const signed = readSigned(body, manifestUrl);
  const manifest = parse(signed.payload, manifestUrl);
  await verifySignature(signed.signed, manifest);
  checkStoredSize(manifest, manifestUrl);
  // Sent even to localhost, which Ghost in development skips, so a backend is checked before
  // it's deployed.
  await challenge(new URL(manifestUrl).origin, manifest.backend_key, fetchFn);
  return { success: true, manifestUrl, manifest };
}

function readManifestUrl(input: string): string {
  // The site's own URL is a name no site has, as only a site knows its own hosts.
  const address = parseManifestUrl(input, { ghostUrls: [UNKNOWN_GHOST_URL], allowLocalhost: true });
  if (!address.success) {
    throw new Failure('APP_MANIFEST_URL_INVALID', address.error);
  }
  return address.manifestUrl;
}

/** The signed manifest's bytes, following redirects on the same host, as Ghost does. */
async function fetchManifest(manifestUrl: string, fetchFn: Fetch): Promise<Uint8Array> {
  // One deadline for the whole read, redirects included, as in Ghost, so a slow app can't stall
  // it several times over.
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let current = new URL(manifestUrl);
  for (let redirects = 0; ; redirects++) {
    const answer = await fetchOnce(fetchFn, current, {
      init: { headers: { accept: 'application/json' }, signal },
      maxBytes: SIGNED_MANIFEST_MAX_BYTES,
      code: 'APP_MANIFEST_UNREACHABLE',
      // A redirect's or an error's body is dropped unread, as Ghost drops it.
      wantsBody: isSuccess,
    });
    // Ghost's HTTP client follows only these, and treats any other status as an answer.
    if (REDIRECT_STATUSES.has(answer.status) && answer.location !== null) {
      current = followRedirect(manifestUrl, current, answer.status, answer.location, redirects);
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

const REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);

/** The URL a redirect leads to, if Ghost would follow it. */
function followRedirect(
  manifestUrl: string,
  current: URL,
  status: number,
  location: string,
  redirects: number,
): URL {
  // Headers arrive as latin1, and Ghost reads the Location as UTF-8, as got and browsers do.
  const target = URL.parse(Buffer.from(location, 'binary').toString('utf8'), current);
  if (!target) {
    throw new Failure(
      'APP_MANIFEST_UNREACHABLE',
      `${manifestUrl} answered with HTTP ${status} and a Location that is not a URL`,
    );
  }
  if (!staysOnHost(current, target)) {
    throw new Failure('APP_MANIFEST_REDIRECTED', `${manifestUrl} redirects to ${target.host}`);
  }
  if (redirects === MAX_REDIRECTS) {
    throw new Failure(
      'APP_MANIFEST_UNREACHABLE',
      `${manifestUrl} redirects more than ${MAX_REDIRECTS} times`,
    );
  }
  // Ghost drops credentials from a Location, as browsers do, and fetch would refuse them.
  target.username = '';
  target.password = '';
  return target;
}

/** Ghost follows a redirect on the same origin, or from HTTP to HTTPS on the same host. */
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

function readSigned(body: Uint8Array, manifestUrl: string) {
  const signed = readSignedManifest(parseJson(decode(body), manifestUrl));
  if (!signed.success) {
    throw new Failure('APP_MANIFEST_UNSIGNED', signed.error);
  }
  return signed;
}

function parse(payload: string, manifestUrl: string): AppManifest {
  const parsed = parseManifest(parseJson(payload, manifestUrl), {
    manifestUrl,
    ghostUrls: [UNKNOWN_GHOST_URL],
    allowLocalhost: true,
  });
  if (parsed.success) {
    return parsed.manifest;
  }
  const detail = formatErrors(parsed.errors, '; ');
  // A manifest signed for another address has its own code, as it's the usual mistake.
  if (parsed.reason === 'manifest_url_mismatch') {
    throw new Failure('APP_MANIFEST_URL_MISMATCH', detail);
  }
  throw new Failure('APP_MANIFEST_INVALID', detail, parsed.errors);
}

async function verifySignature(
  signed: Parameters<typeof verifySignedManifest>[0],
  manifest: AppManifest,
) {
  // With the identity key the manifest names: a site installing the app pins it from here.
  const verified = await verifySignedManifest(signed, manifest.identity_key);
  if (!verified.success) {
    throw new Failure('APP_MANIFEST_SIGNATURE_INVALID', verified.error);
  }
}

function checkStoredSize(manifest: AppManifest, manifestUrl: string) {
  // Ghost measures what it stores, with the paths resolved, after verifying the signature.
  if (storedSize(manifest) > MANIFEST_MAX_BYTES) {
    throw new Failure('APP_MANIFEST_TOO_LARGE', `${manifestUrl}: ${tooLargeMessage()}`);
  }
}

/** Sends Ghost's challenge to the app's origin, and verifies the answer with the backend key. */
async function challenge(origin: string, backendKey: PublicKeyJwk, fetchFn: Fetch) {
  const sent = createChallenge(origin);
  const answer = await fetchOnce(fetchFn, challengeUrl(origin), {
    init: {
      method: 'POST',
      body: sent,
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
    maxBytes: ANSWER_MAX_BYTES,
    code: 'APP_CHALLENGE_UNREACHABLE',
    // Read whatever the status, for the backend's explanation of a refusal.
    wantsBody: () => true,
  });
  const text = answer.body && decode(answer.body);
  if (!isSuccess(answer.status)) {
    throw new Failure('APP_CHALLENGE_UNREACHABLE', describeRefusal(origin, answer.status, text));
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

function describeRefusal(origin: string, status: number, text: string | undefined): string {
  // Ghost sends the challenge to one exact address, so a redirect means the app is set up wrong.
  const redirect = isRedirect(status) ? ' (Ghost follows no redirect for a challenge)' : '';
  // The backend's own explanation, such as handleChallenge's, if it's short enough to show.
  const said = text && text.length < 500 ? `: ${text.trim()}` : '';
  return `${origin} answered the challenge with HTTP ${status}${redirect}${said}`;
}

interface Answer {
  status: number;
  location: string | null;
  /** Up to the limit; `undefined` past it, or when it wasn't wanted. */
  body: Uint8Array | undefined;
}

/** Requests a URL as Ghost does, following no redirect, and reads the body only if it's wanted. */
async function fetchOnce(
  fetchFn: Fetch,
  url: URL | string,
  {
    init,
    maxBytes,
    code,
    wantsBody,
  }: {
    init: RequestInit & { signal: AbortSignal };
    maxBytes: number;
    /** The code a failed request, or a body that breaks while it's read, fails with. */
    code: CheckCode;
    wantsBody: (status: number) => boolean;
  },
): Promise<Answer> {
  try {
    const response = await fetchFn(url, { ...init, redirect: 'manual' });
    const answer = { status: response.status, location: response.headers.get('location') };
    if (!wantsBody(response.status)) {
      // Dropped unread, so a body that stalls or breaks doesn't matter.
      response.body?.cancel().catch(ignoreError);
      return { ...answer, body: undefined };
    }
    return { ...answer, body: await readBytes(response, maxBytes) };
  } catch (error) {
    throw new Failure(code, `${String(url)}: ${describeFetchError(error)}`);
  }
}

/** A failed fetch's message, with the reason Node hides in its `cause`, such as ECONNREFUSED. */
function describeFetchError(error: unknown): string {
  // A fetch may reject with anything, `null` and `undefined` included.
  const { message, cause } = (typeof error === 'object' && error !== null ? error : {}) as {
    message?: string;
    cause?: { code?: string; message?: string };
  };
  const reason = cause?.code ?? cause?.message;
  return reason ? `${message} (${reason})` : String(message ?? error);
}

function parseJson(text: string, manifestUrl: string): unknown {
  try {
    return parseJsonText(text);
  } catch {
    throw new Failure('APP_MANIFEST_NOT_JSON', manifestUrl);
  }
}

// Decoded as UTF-8, which is what JSON should use, whatever charset the app names, as in Ghost.
// Kept with any byte order mark, as Ghost's `Buffer#toString` keeps it: a manifest may start with
// one, which its JSON parse allows, and an answer to the challenge may not.
const decode = (bytes: Uint8Array) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);

const isRedirect = (status: number) => status >= 300 && status < 400;
const isSuccess = (status: number) => status >= 200 && status < 300;
