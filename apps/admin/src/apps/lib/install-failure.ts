import { APIError, JSONError, getErrorMessage } from '@tryghost/admin-x-framework/errors';

/** Something the app's developer has to fix, with what Ghost said about it. */
export interface InstallProblem {
  title: string;
  detail: string;
}

/** Why an app couldn't be reviewed or installed, as the install screen shows it. */
export type InstallFailure =
  /** The app didn't answer as expected. Trying again may work. */
  | { kind: 'unreachable'; detail: string }
  /** What the install link points at can't be installed until its developer fixes it. */
  | { kind: 'problems'; problems: InstallProblem[] }
  /** The install link doesn't say which app to install, so there is nothing to check. */
  | { kind: 'incomplete-link' }
  /** This site's Ghost is older than Admin and can't install apps yet. */
  | { kind: 'unsupported' }
  /** Anything else, such as Ghost itself being unreachable. */
  | { kind: 'error'; message: string };

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Whether Ghost answered that it has no such endpoint. Admin and Ghost deploy separately,
 * so Admin can be newer than the Ghost it talks to; none of the apps endpoints answer 404
 * otherwise, an unknown installation aside.
 */
export function isUnsupported(error: unknown): boolean {
  return error instanceof APIError && error.response?.status === 404;
}

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
      return { kind: 'unreachable', detail };
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
      return isUnsupported(error)
        ? { kind: 'unsupported' }
        : { kind: 'error', message: getErrorMessage(error, FALLBACK_MESSAGE) };
  }
}
