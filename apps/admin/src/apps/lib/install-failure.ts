import { isUnconfirmedAppCode } from '@tryghost/app-contracts';
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

/** Turns an error from previewing, installing or approving into what the screen shows. */
export function installFailureOf(error: unknown): InstallFailure {
  const apiError = apiErrorOf(error);
  const detail = apiError?.context ?? '';

  switch (apiError?.code) {
    case 'APP_MANIFEST_UNREACHABLE':
    case 'APP_CHALLENGE_UNREACHABLE':
      return { kind: 'unreachable', detail };
    case 'APP_IDENTITY_MISMATCH':
      return { kind: 'another-developer' };
    case 'APP_MANIFEST_UNSIGNED':
      return {
        kind: 'problems',
        problems: [{ title: 'The app’s details aren’t signed', detail }],
      };
    case 'APP_MANIFEST_URL_MISMATCH':
      return {
        kind: 'problems',
        problems: [{ title: 'The app’s details are for another install link', detail }],
      };
    case 'APP_MANIFEST_SIGNED_IN_FUTURE':
      return {
        kind: 'problems',
        problems: [{ title: 'The app’s details say they were signed in the future', detail }],
      };
    case 'APP_MANIFEST_URL_INVALID':
      return { kind: 'problems', problems: [{ title: 'The install link isn’t valid', detail }] };
    case 'APP_MANIFEST_REDIRECTED':
      return {
        kind: 'problems',
        problems: [{ title: 'The app’s details redirect to another site', detail }],
      };
    case 'APP_MANIFEST_NOT_JSON':
      return {
        kind: 'problems',
        problems: [{ title: 'The app’s details aren’t in the expected format', detail }],
      };
    case 'APP_MANIFEST_TOO_LARGE':
      return {
        kind: 'problems',
        problems: [{ title: 'The app’s details are too large', detail }],
      };
    case 'APP_MANIFEST_OTHER_APP':
      return {
        kind: 'problems',
        problems: [{ title: 'This install link is for a different app', detail }],
      };
    case 'APP_MANIFEST_INVALID': {
      const problems = problemsOf((apiError as { details?: unknown }).details);
      return {
        kind: 'problems',
        problems: problems.length
          ? problems
          : [{ title: 'The app’s details aren’t valid', detail }],
      };
    }
    default:
      // A bad signature, a failed challenge, or a manifest older than one the site has seen.
      if (isUnconfirmedAppCode(apiError?.code)) {
        return { kind: 'unconfirmed', detail };
      }
      return { kind: 'error', message: getErrorMessage(error, FALLBACK_MESSAGE) };
  }
}
