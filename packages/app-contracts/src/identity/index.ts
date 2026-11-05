/**
 * App identity: the signed manifest and the challenge, with what it takes to sign and
 * verify both, and the limits Ghost fetches them with. Ghost core verifies with these, and an
 * app's tooling signs with them and checks an app by them.
 *
 * It loads jose and is for servers only. Admin never imports it: it acts on what the Admin
 * API reports about an app's identity.
 */

export {
  CHALLENGE_PATH,
  CHALLENGE_PURPOSE,
  answerChallenge,
  challengeUrl,
  createChallenge,
  verifyChallengeAnswer,
  type AnswerChallengeResult,
  type Challenge,
  type ChallengeAnswer,
} from './challenge.ts';
export {
  ANSWER_MAX_BYTES,
  ANSWER_TOO_LARGE,
  APP_LOAD_MESSAGES,
  FETCH_TIMEOUT_MS,
  MANIFEST_MAX_BYTES,
  MAX_REDIRECTS,
  REDIRECT_STATUSES,
  SIGNED_MANIFEST_MAX_BYTES,
  dropCredentials,
  isRedirect,
  isSuccess,
  parseJsonText,
  readLocation,
  staysOnHost,
  type AppLoadCode,
} from './loading.ts';
export { UNCONFIRMED_APP_CODES, isUnconfirmedAppCode, type UnconfirmedAppCode } from './codes.ts';
export { PrivateKeyJwkSchema, decodeUtf8, thumbprintOf, type PrivateKey } from './keys.ts';
export type { PrivateKeyJwk, SignedManifest } from './types.ts';
export {
  SIGNED_MANIFEST_TYPE,
  SignedManifestSchema,
  readSignedManifest,
  signManifest,
  verifySignedManifest,
  type ReadSignedManifestResult,
  type VerifyResult,
} from './signed-manifest.ts';
