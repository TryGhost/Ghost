import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import {
  challengeUrl,
  createChallenge,
  verifyChallengeAnswer,
} from '@tryghost/app-contracts/identity';
import { isLocalhost, parseManifestUrl } from '@tryghost/app-contracts/manifest';
import type { AppFetchFailure, FetchFromApp } from './fetch-from-app';
import type { LoadedManifest } from './load-manifest';

const ANSWER_MAX_BYTES = 4 * 1024;

/**
 * How far ahead of Ghost's clock a manifest may say it was signed, for clocks that
 * disagree a little. Any further, and one manifest would hold every site to its time.
 */
const CLOCK_SKEW_SECONDS = 5 * 60;

/** What the site has to say about an app it already has. */
export interface PinnedIdentity {
  /** The thumbprint of the identity key the app was installed with. */
  identityKeyThumbprint: string;
  /** When the newest manifest the installation has seen was signed, in seconds. */
  signedAt: number;
  /** That manifest's digest. */
  signedDigest: string;
}

export interface IdentityCheckResult {
  /** The app's origin, if the site trusts it so it skipped the challenge. */
  trustedOrigins: string[];
}

/** The site's trust, as configured: listed origins, and whether loopback origins count too. */
export interface TrustConfig {
  /** `apps.trustedOrigins`, already read as origins at boot. */
  trustedOrigins: ReadonlySet<string>;
  /** Only while Ghost runs in development. */
  trustLoopback: boolean;
}

type ChallengeOutcome =
  | { kind: 'trusted' }
  | { kind: 'answered'; sent: string; text: string }
  /**
   * Built when the check reads it, so a challenge whose manifest failed to load logs
   * nothing.
   */
  | { kind: 'failed'; error: () => Error }
  /** The manifest URL isn't one Ghost would fetch, which loading it reports. */
  | { kind: 'skipped' };

/**
 * A challenge sent to the origin of a manifest URL, before its manifest is loaded. An app is
 * one origin, so this is the only one there is to challenge. Never rejects, so it can be
 * left unawaited when loading the manifest fails.
 */
export interface StartedChallenge {
  origin: string | null;
  outcome: Promise<ChallengeOutcome>;
}

export interface IdentityChecker {
  /**
   * Starts the challenge for a manifest URL's origin, so it runs while the manifest loads.
   * The origin follows from the URL alone: a loaded manifest must name the address it was
   * fetched from, and every path in it resolves against that address.
   */
  challenge(manifestUrl: string): StartedChallenge;
  /**
   * Finishes the check once the manifest has loaded and its signature is verified:
   *
   * 1. It's signed no more than a few minutes ahead of Ghost's clock.
   * 2. For an app the site has, it's signed with the pinned identity key, no earlier than
   *    the newest manifest the installation has seen, and not at the same moment as a
   *    different one.
   * 3. The app's origin answered the challenge with the manifest's backend key, unless the
   *    site trusts that origin. A rotated backend key works at once, as the manifest that
   *    names it is the one the answer is checked against.
   *
   * Every failure is thrown as a ValidationError, those from steps 2 and 3 with one of
   * `UNCONFIRMED_APP_CODES` unless the origin couldn't be reached.
   */
  check(
    loaded: LoadedManifest,
    pinned: PinnedIdentity | null,
    started: StartedChallenge,
  ): Promise<IdentityCheckResult>;
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

/** Refuses a manifest whose signing time can't follow what the site has seen. */
function checkSignedAt(
  loaded: LoadedManifest,
  pinned: PinnedIdentity | null,
  now: number,
): Error | null {
  if (loaded.issuedAt > now + CLOCK_SKEW_SECONDS) {
    return new errors.ValidationError({
      message: 'The app’s manifest says it was signed in the future.',
      code: 'APP_MANIFEST_SIGNED_IN_FUTURE',
      context: `iat is ${new Date(loaded.issuedAt * 1000).toISOString()}; check the clock of whatever signed it`,
    });
  }
  if (!pinned) {
    return null;
  }
  if (loaded.issuedAt < pinned.signedAt) {
    return new errors.ValidationError({
      message: 'Ghost couldn’t confirm this is the app’s current version.',
      code: 'APP_MANIFEST_OUTDATED',
      context: `It was signed at ${new Date(loaded.issuedAt * 1000).toISOString()}, before the newest one seen, at ${new Date(pinned.signedAt * 1000).toISOString()}. To roll back, sign the older manifest again.`,
    });
  }
  if (loaded.issuedAt === pinned.signedAt && loaded.digest !== pinned.signedDigest) {
    return new errors.ValidationError({
      message: 'Ghost couldn’t confirm this is the app’s current version.',
      code: 'APP_MANIFEST_CONFLICT',
      context: 'Another manifest was signed at the same second. Sign this one again.',
    });
  }
  return null;
}

export function createIdentityChecker({
  fetchFromApp,
  logging,
  getTrustConfig,
  now = () => Math.floor(Date.now() / 1000),
}: {
  fetchFromApp: FetchFromApp;
  logging: Pick<GhostLogger, 'warn'>;
  getTrustConfig: () => TrustConfig;
  /** Ghost's clock, in seconds since the epoch. */
  now?: () => number;
}): IdentityChecker {
  function isTrusted(origin: string) {
    const { trustedOrigins, trustLoopback } = getTrustConfig();
    return trustedOrigins.has(origin) || (trustLoopback && isLocalhost(new URL(origin).hostname));
  }

  async function send(origin: string): Promise<ChallengeOutcome> {
    if (isTrusted(origin)) {
      return { kind: 'trusted' };
    }
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
        return {
          kind: 'failed',
          error: () =>
            challengeFailed(origin, `The answer is larger than ${ANSWER_MAX_BYTES / 1024} KB`),
        };
      }
      const { failure } = answered;
      return { kind: 'failed', error: () => challengeUnreachable(origin, failure, logging) };
    }
    return { kind: 'answered', sent, text: answered.text };
  }

  function challenge(manifestUrl: string): StartedChallenge {
    // Only an address Ghost would fetch the manifest from gets a request. Loading the
    // manifest refuses the rest with its own error.
    const address = parseManifestUrl(manifestUrl, getTrustConfig().trustLoopback);
    if (!address.success) {
      return { origin: null, outcome: Promise.resolve({ kind: 'skipped' }) };
    }
    const origin = new URL(address.manifestUrl).origin;
    const outcome = send(origin).catch((error: unknown): ChallengeOutcome => ({
      kind: 'failed',
      error: () => (error instanceof Error ? error : new Error(String(error))),
    }));
    return { origin, outcome };
  }

  async function check(
    loaded: LoadedManifest,
    pinned: PinnedIdentity | null,
    started: StartedChallenge,
  ): Promise<IdentityCheckResult> {
    if (pinned && loaded.identityKeyThumbprint !== pinned.identityKeyThumbprint) {
      // No detail: the publisher is told it isn't from the same developer, never about keys.
      throw new errors.ValidationError({
        message: 'This app doesn’t come from the same developer as the installed one.',
        code: 'APP_IDENTITY_MISMATCH',
      });
    }
    const signedAt = checkSignedAt(loaded, pinned, now());
    if (signedAt) {
      throw signedAt;
    }

    const origin = new URL(loaded.manifestUrl).origin;
    // Always the same origin, as the manifest URL the challenge started from is the one the
    // manifest was loaded from; checked anyway, so a caller's mistake can't skip it.
    const outcome = await (started.origin === origin ? started.outcome : send(origin));
    switch (outcome.kind) {
      case 'trusted':
        return { trustedOrigins: [origin] };
      case 'failed':
        throw outcome.error();
      case 'skipped':
        throw challengeFailed(origin, 'The origin was not challenged');
      case 'answered': {
        const verified = await verifyChallengeAnswer(
          outcome.sent,
          outcome.text,
          loaded.manifest.backend_key,
        );
        if (!verified.success) {
          throw challengeFailed(origin, verified.error);
        }
        return { trustedOrigins: [] };
      }
    }
  }

  return { challenge, check };
}

/**
 * Reads `apps.trustedOrigins` as a set of origins, or names the first entry that isn't one.
 * Anything more than an origin would read as trusting less than it does, and a wildcard
 * host, which the URL parser accepts, as trusting more.
 */
export function readTrustedOrigins(
  entries: unknown,
): { success: true; origins: Set<string> } | { success: false; entry: unknown } {
  if (!Array.isArray(entries)) {
    return { success: false, entry: entries };
  }
  const origins = new Set<string>();
  for (const entry of entries) {
    const url = typeof entry === 'string' ? URL.parse(entry) : null;
    if (
      !url ||
      url.origin === 'null' ||
      url.href !== `${url.origin}/` ||
      url.hostname.includes('*')
    ) {
      return { success: false, entry };
    }
    origins.add(url.origin);
  }
  return { success: true, origins };
}
