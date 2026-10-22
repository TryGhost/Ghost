import { CompactSign, base64url, compactVerify, importJWK } from 'jose';
import { z } from 'zod';

import type { PublicKeyJwk } from '../manifest/keys.ts';
import { decodeJson, decodeUtf8, type PrivateKey } from './keys.ts';
import type { VerifyResult } from './signed-manifest.ts';

/** Where on an origin Ghost posts a challenge. */
export const CHALLENGE_PATH = '/.well-known/ghost-app/challenge';

/** What a challenge is for, signed with it, so its answer can't pass for any other signature. */
export const CHALLENGE_PURPOSE = 'ghost-app-challenge';

const ALGORITHM = 'Ed25519';
const NONCE_BYTES = 32;

const ProtectedHeader = z.strictObject({ alg: z.literal(ALGORITHM) });

const EXPECTED_HEADER = JSON.stringify({ alg: ALGORITHM });

/**
 * What Ghost posts to an origin, as JSON. The backend signs the exact bytes it received,
 * so neither side has to agree on how JSON is written.
 */
export interface Challenge {
  purpose: typeof CHALLENGE_PURPOSE;
  /** The origin being challenged, so an answer can't be relayed from another origin. */
  origin: string;
  /** 32 random bytes in base64url, so no answer can be reused. */
  nonce: string;
}

/** What a backend answers a challenge with, as JSON. */
export interface ChallengeAnswer {
  /** A compact JWS whose payload is the challenge's exact bytes, signed with the backend key. */
  signature: string;
}

const ChallengeShape = z.strictObject({
  purpose: z.literal(CHALLENGE_PURPOSE),
  origin: z.string(),
  nonce: z.string(),
});

const ChallengeAnswerShape = z.object({ signature: z.string() });

/** The URL to post a challenge for an origin to. */
export function challengeUrl(origin: string): string {
  return new URL(CHALLENGE_PATH, origin).href;
}

/** A fresh challenge for an origin, as the exact text to post and to verify the answer with. */
export function createChallenge(origin: string): string {
  const challenge: Challenge = {
    purpose: CHALLENGE_PURPOSE,
    origin: new URL(origin).origin,
    nonce: base64url.encode(crypto.getRandomValues(new Uint8Array(NONCE_BYTES))),
  };
  return JSON.stringify(challenge);
}

export type AnswerChallengeResult =
  | { success: true; answer: ChallengeAnswer }
  | { success: false; error: string };

/**
 * Answers a challenge a backend received, signing it with the backend key. A challenge
 * for any origin but the backend's own is refused, so nobody can relay it to the backend
 * to prove an origin it doesn't serve.
 */
export async function answerChallenge(
  body: string,
  { backendKey, origins }: { backendKey: PrivateKey; origins: string[] },
): Promise<AnswerChallengeResult> {
  const challenge = ChallengeShape.safeParse(parseJson(body));
  if (!challenge.success) {
    return { success: false, error: 'Expected a challenge of {purpose, origin, nonce}' };
  }
  const own = new Set(origins.map((origin) => new URL(origin).origin));
  if (!own.has(challenge.data.origin)) {
    return { success: false, error: `${challenge.data.origin} is not this backend’s origin` };
  }
  const signature = await new CompactSign(new TextEncoder().encode(body))
    .setProtectedHeader({ alg: ALGORITHM })
    .sign(backendKey);
  return { success: true, answer: { signature } };
}

/**
 * Checks an origin's answer to a challenge: a signature with the backend key over the
 * exact text Ghost posted, under a protected header of only `alg`. Any other member could
 * change what the signature covers, as `b64: false` does, or name another key. The error
 * only says how the answer fell short.
 */
export async function verifyChallengeAnswer(
  challenge: string,
  answer: string,
  backendKey: PublicKeyJwk,
): Promise<VerifyResult> {
  const parsed = ChallengeAnswerShape.safeParse(parseJson(answer));
  if (!parsed.success) {
    return { success: false, error: 'Expected an answer of {"signature": "<compact JWS>"}' };
  }
  let key;
  try {
    key = await importJWK(backendKey, ALGORITHM);
  } catch {
    return { success: false, error: 'backend_key is not a usable Ed25519 key' };
  }
  const [header = ''] = parsed.data.signature.split('.');
  if (!ProtectedHeader.safeParse(decodeJson(header)).success) {
    return { success: false, error: `Expected a protected header of ${EXPECTED_HEADER}` };
  }
  let payload: Uint8Array;
  try {
    ({ payload } = await compactVerify(parsed.data.signature, key, { algorithms: [ALGORITHM] }));
  } catch {
    return { success: false, error: 'The signature was not made with backend_key' };
  }
  if (!sameText(payload, challenge)) {
    return { success: false, error: 'The signature is not over the challenge that was sent' };
  }
  return { success: true };
}

function sameText(bytes: Uint8Array, text: string): boolean {
  try {
    return decodeUtf8(bytes) === text;
  } catch {
    return false;
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
