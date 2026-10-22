/**
 * App identity: the signed manifest and the challenge, with what it takes to sign and
 * verify both. Ghost core verifies with these, and an app's tooling signs with them.
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
export { thumbprintOf, type PrivateKey } from './keys.ts';
export {
  SIGNED_MANIFEST_TYPE,
  readSignedManifest,
  signManifest,
  verifySignedManifest,
  type ReadSignedManifestResult,
  type SignedManifest,
  type VerifyResult,
} from './signed-manifest.ts';
