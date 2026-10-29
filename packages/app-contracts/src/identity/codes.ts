/**
 * The codes Ghost fails with when it couldn't confirm an app is the one it says it is,
 * whether reviewing an install link or starting a session. They're kept apart from the
 * codes for an app that is down or broken, because the publisher should hear something
 * different: contact the developer, and don't install it again from a link, which is the
 * one way a different developer's key gets pinned.
 *
 * Free of jose and zod, so Admin reads it from the root entry point.
 */
export const UNCONFIRMED_APP_CODES = [
  /** The manifest names another address than the one it was fetched from. */
  'APP_MANIFEST_URL_MISMATCH',
  /** The signature wasn't made with the identity key the manifest names. */
  'APP_MANIFEST_SIGNATURE_INVALID',
  /** The manifest was signed before the newest one the site has seen for the app. */
  'APP_MANIFEST_OUTDATED',
  /** Another manifest was signed at the same moment as the newest one the site has seen. */
  'APP_MANIFEST_CONFLICT',
  /** The manifest is signed with another key than the one the app was installed with. */
  'APP_IDENTITY_MISMATCH',
  /** The app's origin didn't answer the challenge with the manifest's backend key. */
  'APP_CHALLENGE_FAILED',
] as const;

export type UnconfirmedAppCode = (typeof UNCONFIRMED_APP_CODES)[number];

const UNCONFIRMED: ReadonlySet<unknown> = new Set(UNCONFIRMED_APP_CODES);

export function isUnconfirmedAppCode(code: unknown): code is UnconfirmedAppCode {
  return UNCONFIRMED.has(code);
}
