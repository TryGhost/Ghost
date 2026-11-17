/**
 * Ghost couldn't confirm the app is the one it says it is. Kept apart from an app that's down
 * or broken because the publisher should hear something different: contact the developer, and
 * don't install it again from a link, the one way a different developer's key gets pinned.
 */
export const UNCONFIRMED_APP_CODES = [
  /** The manifest names another address than the one it was fetched from. */
  'APP_MANIFEST_URL_MISMATCH',
  /** The signature wasn't made with the identity key the manifest names. */
  'APP_MANIFEST_SIGNATURE_INVALID',
  /** The manifest is signed with another key than the one the app was installed with. */
  'APP_IDENTITY_MISMATCH',
  /** The manifest names a backend key a newer manifest from the same developer replaced. */
  'APP_BACKEND_KEY_RETIRED',
  /** The app's origin didn't answer the challenge with the manifest's backend key. */
  'APP_CHALLENGE_FAILED',
] as const;

export type UnconfirmedAppCode = (typeof UNCONFIRMED_APP_CODES)[number];

const UNCONFIRMED: ReadonlySet<unknown> = new Set(UNCONFIRMED_APP_CODES);

export function isUnconfirmedAppCode(code: unknown): code is UnconfirmedAppCode {
  return UNCONFIRMED.has(code);
}
