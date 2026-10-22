import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import {
  challengeUrl,
  createChallenge,
  verifyChallengeAnswer,
} from '@tryghost/app-contracts/identity';
import { isLocalhost } from '@tryghost/app-contracts/manifest';
import type { AppFetchFailure, FetchFromApp } from './fetch-from-app';
import type { LoadedManifest } from './load-manifest';

const ANSWER_MAX_BYTES = 4 * 1024;

/**
 * The codes an identity check fails with. A loaded manifest that fails to verify fails with
 * the first three; the check itself with the rest.
 */
export const IDENTITY_FAILURE_CODES: ReadonlySet<string> = new Set([
  'APP_MANIFEST_UNSIGNED',
  'APP_MANIFEST_URL_MISMATCH',
  'APP_MANIFEST_SIGNATURE_INVALID',
  'APP_IDENTITY_MISMATCH',
  'APP_BACKEND_KEY_RETIRED',
  'APP_CHALLENGE_FAILED',
  'APP_CHALLENGE_UNREACHABLE',
]);

/** What the site has to say about an app it already has. */
export interface PinnedIdentity {
  /** The thumbprint of the identity key the app was installed with. */
  identityKeyThumbprint: string;
  /** Thumbprints of the backend keys the installation has seen replaced. */
  retiredBackendKeys: ReadonlySet<string>;
}

export interface IdentityCheckResult {
  /** The origins the manifest names that skipped the challenge, as the site trusts them. */
  trustedOrigins: string[];
}

export type CheckIdentity = (
  loaded: LoadedManifest,
  pinned: PinnedIdentity | null,
) => Promise<IdentityCheckResult>;

/** The site's trust, as configured: listed origins, and whether loopback origins count too. */
export interface TrustConfig {
  /** `apps.trustedOrigins`, unchecked. */
  trustedOrigins: unknown;
  /** Only while Ghost runs in development. */
  trustLoopback: boolean;
}

function parseTrustedOrigins(entries: unknown): Set<string> {
  const origins = new Set<string>();
  const invalid = (entry: unknown) =>
    new errors.InternalServerError({
      message: 'apps.trustedOrigins must be a list of origins, such as https://app.example.com.',
      code: 'APP_TRUSTED_ORIGINS_INVALID',
      context: JSON.stringify(entry),
    });
  if (!Array.isArray(entries)) {
    throw invalid(entries);
  }
  for (const entry of entries) {
    const url = typeof entry === 'string' ? URL.parse(entry) : null;
    // Anything more than an origin would read as trusting less than it does, and a wildcard
    // host, which the URL parser accepts, as trusting more.
    if (
      !url ||
      url.origin === 'null' ||
      url.href !== `${url.origin}/` ||
      url.hostname.includes('*')
    ) {
      throw invalid(entry);
    }
    origins.add(url.origin);
  }
  return origins;
}

/** Each origin the manifest names that Ghost loads from or fetches, in order, once. */
function originsOf({ manifest }: LoadedManifest): string[] {
  const urls = [manifest.manifest_url, ...manifest.surfaces.map((surface) => surface.url)];
  return [...new Set(urls.map((url) => new URL(url).origin))];
}

function challengeUnreachable(
  origin: string,
  failure: Exclude<AppFetchFailure, { reason: 'too_large' }>,
  logging: Pick<GhostLogger, 'warn'>,
) {
  // Says only how the app answered, never why the request failed, so a review can't be
  // used to probe the server's network. The cause is logged for the operator.
  const status = 'status' in failure ? failure.status : undefined;
  const context = status ? `${origin} answered the challenge with HTTP ${status}` : origin;
  logging.warn(`Could not challenge the app at ${origin}`);
  logging.warn(failure.reason === 'unreachable' ? failure.cause : context);
  return new errors.ValidationError({
    message: 'Could not reach the app to confirm it comes from its developer.',
    code: 'APP_CHALLENGE_UNREACHABLE',
    context,
  });
}

function challengeFailed(origin: string, why: string) {
  return new errors.ValidationError({
    message: 'Ghost couldn’t confirm the app comes from its developer.',
    code: 'APP_CHALLENGE_FAILED',
    context: `${origin}: ${why}`,
  });
}

/**
 * Checks a loaded manifest, whose signature is already verified, is the app it says it
 * is:
 *
 * 1. For an app the site has, the manifest is signed with the pinned identity key, and
 *    doesn't name a retired backend key.
 * 2. Every origin the manifest names, its own included, answers a challenge with the
 *    backend key, unless the site trusts that origin. Origins are challenged in parallel,
 *    each once.
 *
 * Every failure is thrown as a ValidationError with one of `IDENTITY_FAILURE_CODES`.
 * `getTrustConfig` is called on every check because it reads config; a trusted origin that
 * isn't one fails every check, rather than trusting more or less than was meant.
 */
export function createIdentityChecker({
  fetchFromApp,
  logging,
  getTrustConfig,
}: {
  fetchFromApp: FetchFromApp;
  logging: Pick<GhostLogger, 'warn'>;
  getTrustConfig: () => TrustConfig;
}): CheckIdentity {
  async function challenge(origin: string, loaded: LoadedManifest): Promise<Error | null> {
    const sent = createChallenge(origin);
    const answered = await fetchFromApp(challengeUrl(origin), {
      maxBytes: ANSWER_MAX_BYTES,
      method: 'POST',
      body: sent,
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      // The answer has to come from the origin being checked.
      redirect: 'error',
    });
    if (!answered.success) {
      if (answered.failure.reason === 'too_large') {
        return challengeFailed(origin, `The answer is larger than ${ANSWER_MAX_BYTES / 1024} KB`);
      }
      return challengeUnreachable(origin, answered.failure, logging);
    }
    const verified = await verifyChallengeAnswer(sent, answered.text, loaded.manifest.backend_key);
    return verified.success ? null : challengeFailed(origin, verified.error);
  }

  return async function checkIdentity(loaded, pinned) {
    if (pinned && loaded.identityKeyThumbprint !== pinned.identityKeyThumbprint) {
      // No detail: the publisher is told it isn't from the same developer, never about keys.
      throw new errors.ValidationError({
        message: 'This app doesn’t come from the same developer as the installed one.',
        code: 'APP_IDENTITY_MISMATCH',
      });
    }
    if (pinned?.retiredBackendKeys.has(loaded.backendKeyThumbprint)) {
      throw new errors.ValidationError({
        message: 'Ghost couldn’t confirm the app comes from its developer.',
        code: 'APP_BACKEND_KEY_RETIRED',
        context: 'backend_key has been replaced, and can’t be used again',
      });
    }

    const { trustedOrigins, trustLoopback } = getTrustConfig();
    const trusted = parseTrustedOrigins(trustedOrigins);
    const isTrusted = (origin: string) =>
      trusted.has(origin) || (trustLoopback && isLocalhost(new URL(origin).hostname));

    const origins = originsOf(loaded);
    const failures = await Promise.all(
      origins.filter((origin) => !isTrusted(origin)).map((origin) => challenge(origin, loaded)),
    );
    const failure = failures.find((result) => result !== null);
    if (failure) {
      throw failure;
    }
    return { trustedOrigins: origins.filter(isTrusted) };
  };
}
