import { type AppFailureCode, isAppFailureCode } from '@tryghost/app-contracts';
import { JSONError, getErrorMessage } from '@tryghost/admin-x-framework/errors';

/** Something the app's developer has to fix, with what Ghost said about it. */
export interface InstallProblem {
  title: string;
  detail: string;
}

/** Why an app couldn't be reviewed or installed, as the install screen shows it. */
export type InstallFailure =
  /** The app didn't answer as expected. Trying again may work. */
  | { kind: 'unreachable'; detail: string }
  /**
   * The link is for an app the site has, from another developer. Nothing can approve it, and
   * nothing more is said, so the publisher isn't drawn into the details.
   */
  | { kind: 'another-developer' }
  /**
   * Ghost couldn't confirm the app comes from its developer. Its explanation, the detail,
   * starts by saying so.
   */
  | { kind: 'unconfirmed'; detail: string }
  /** What the install link points at can't be installed until its developer fixes it. */
  | { kind: 'problems'; problems: InstallProblem[] }
  /** The install link doesn't say which app to install, so there is nothing to check. */
  | { kind: 'incomplete-link' }
  /** Anything else, such as Ghost itself being unreachable. */
  | { kind: 'error'; message: string };

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/** The first error of an Admin API error response, if that's what was thrown. */
export function apiErrorOf(error: unknown) {
  return error instanceof JSONError ? error.data?.errors?.[0] : undefined;
}

function problemsOf(details: unknown): InstallProblem[] {
  if (!Array.isArray(details)) {
    return [];
  }
  return details.flatMap((entry: unknown) => {
    const { path, message } = (entry ?? {}) as { path?: unknown; message?: unknown };
    return typeof message === 'string'
      ? [{ title: typeof path === 'string' && path ? path : 'Manifest', detail: message }]
      : [];
  });
}

/** Undefined leaves the screen to show Ghost's own message. */
type Reading = (detail: string, details: unknown) => InstallFailure | undefined;

const unreachable: Reading = (detail) => ({ kind: 'unreachable', detail });
const unconfirmed: Reading = (detail) => ({ kind: 'unconfirmed', detail });
const problem =
  (title: string): Reading =>
  (detail) => ({ kind: 'problems', problems: [{ title, detail }] });
const notExplained: Reading = () => undefined;

/** Keyed by every code, so a new one fails the type-check until this screen decides on it. */
const READINGS: Record<AppFailureCode, Reading> = {
  APP_MANIFEST_UNREACHABLE: unreachable,
  APP_CHALLENGE_UNREACHABLE: unreachable,

  // The installed app came first, so the link is refused as another developer's, without
  // details. A session shows it as unconfirmed.
  APP_IDENTITY_MISMATCH: () => ({ kind: 'another-developer' }),
  APP_MANIFEST_SIGNATURE_INVALID: unconfirmed,
  APP_BACKEND_KEY_RETIRED: unconfirmed,
  APP_CHALLENGE_FAILED: unconfirmed,
  // Refused before the signature is checked, so it's a manifest problem for the developer.
  // A session shows it as unconfirmed.
  APP_MANIFEST_URL_MISMATCH: problem('The app’s details are for another install link'),

  APP_MANIFEST_UNSIGNED: problem('The app’s details aren’t signed'),
  APP_MANIFEST_URL_INVALID: problem('The install link isn’t valid'),
  APP_MANIFEST_REDIRECTED: problem('The app’s details redirect to another site'),
  APP_MANIFEST_NOT_JSON: problem('The app’s details aren’t in the expected format'),
  APP_MANIFEST_TOO_LARGE: problem('The app’s details are too large'),
  APP_MANIFEST_OTHER_APP: problem('This install link is for a different app'),
  APP_MANIFEST_INVALID: (detail, details) => {
    const problems = problemsOf(details);
    return {
      kind: 'problems',
      problems: problems.length ? problems : [{ title: 'The app’s details aren’t valid', detail }],
    };
  },

  // The install dialog handles these itself.
  APP_MANIFEST_CHANGED: notExplained,
  APP_INSTALLATION_CHANGED: notExplained,
  APP_ALREADY_INSTALLED: notExplained,
  APP_INSTALLATION_UNINSTALLED: notExplained,
  // Never the answer to a review.
  APP_NOT_INSTALLED: notExplained,
  APP_UNAVAILABLE: notExplained,
};

/** Turns an error from previewing, installing or approving into what the screen shows. */
export function installFailureOf(error: unknown): InstallFailure {
  const apiError = apiErrorOf(error);
  const code = apiError?.code;
  const failure = isAppFailureCode(code)
    ? READINGS[code](apiError?.context ?? '', apiError?.details)
    : undefined;
  return failure ?? { kind: 'error', message: getErrorMessage(error, FALLBACK_MESSAGE) };
}
