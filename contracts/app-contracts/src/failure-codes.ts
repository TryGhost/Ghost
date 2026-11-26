import { UNCONFIRMED_APP_CODES } from './identity/codes.ts';

/** Trying again may work. */
const UNREACHABLE_APP_CODES = [
  /** Also when the app answers with an error or a bad redirect. */
  'APP_MANIFEST_UNREACHABLE',
  'APP_CHALLENGE_UNREACHABLE',
] as const;

/** Only the app's developer can fix these. */
const UNUSABLE_MANIFEST_CODES = [
  'APP_MANIFEST_URL_INVALID',
  /** To another host. */
  'APP_MANIFEST_REDIRECTED',
  /** The signed manifest is over what Ghost reads, or its manifest over what Ghost stores. */
  'APP_MANIFEST_TOO_LARGE',
  'APP_MANIFEST_NOT_JSON',
  'APP_MANIFEST_UNSIGNED',
  /** Also for an invalid icon. The details list each problem. */
  'APP_MANIFEST_INVALID',
  'APP_MANIFEST_OTHER_APP',
] as const;

/**
 * The publisher confirmed a review that's out of date. A changed manifest or installation
 * carries the current review in the error's details when Ghost has one.
 */
export const OUTDATED_REVIEW_CODES = [
  'APP_MANIFEST_CHANGED',
  'APP_INSTALLATION_CHANGED',
  'APP_ALREADY_INSTALLED',
  'APP_INSTALLATION_UNINSTALLED',
] as const;

/** Ghost ended or refused an app session's tokens; nothing the app did. */
export const APP_SESSION_CODES = [
  /** The site runs the legacy auth engine, which can't issue app tokens. */
  'APP_AUTH_ENGINE_UNSUPPORTED',
  /** Only a verified staff session of an Administrator or the Owner gets app tokens. */
  'APP_STAFF_SESSION_REQUIRED',
  /** A renewal found the installation suspended, or changed since the session started. */
  'APP_SESSION_ENDED',
  /** The apps flag was turned on since Ghost started; apps open after a restart. */
  'APP_TOKENS_UNAVAILABLE',
] as const;

/**
 * Admin can only explain a code listed here; any other shows as an unknown error. A Ghost
 * core test checks the list against the codes the app installations service throws.
 */
export const APP_FAILURE_CODES = [
  ...UNREACHABLE_APP_CODES,
  ...UNCONFIRMED_APP_CODES,
  ...UNUSABLE_MANIFEST_CODES,
  ...OUTDATED_REVIEW_CODES,
  ...APP_SESSION_CODES,
  /** Also once uninstalled. */
  'APP_NOT_INSTALLED',
  /** A session failed because of the app, for a reason with no code of its own. */
  'APP_UNAVAILABLE',
] as const;

export type AppFailureCode = (typeof APP_FAILURE_CODES)[number];

const FAILURE_CODES: ReadonlySet<unknown> = new Set(APP_FAILURE_CODES);

/** Unlike `code in table`, false for names every object has, such as `constructor`. */
export function isAppFailureCode(code: unknown): code is AppFailureCode {
  return FAILURE_CODES.has(code);
}

const OUTDATED_REVIEW: ReadonlySet<unknown> = new Set(OUTDATED_REVIEW_CODES);

export function isOutdatedReviewCode(
  code: unknown,
): code is (typeof OUTDATED_REVIEW_CODES)[number] {
  return OUTDATED_REVIEW.has(code);
}
