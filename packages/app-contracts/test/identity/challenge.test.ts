import assert from 'node:assert/strict';

import { CompactSign } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  CHALLENGE_PURPOSE,
  answerChallenge,
  challengeUrl,
  createChallenge,
  verifyChallengeAnswer,
} from '../../src/identity/index.ts';
import { newKeyPair, type KeyPair } from './helpers.ts';

const ORIGIN = 'https://podcast.example.com';

let backend: KeyPair;
let other: KeyPair;

beforeAll(async () => {
  backend = await newKeyPair();
  other = await newKeyPair();
});

async function answerOf(challenge: string, key = backend) {
  const result = await answerChallenge(challenge, {
    backendKey: key.privateKey,
    requestUrl: `${ORIGIN}/.well-known/ghost-app/challenge`,
  });
  assert(result.success, `Expected the challenge to be answered: ${JSON.stringify(result)}`);
  return JSON.stringify(result.answer);
}

describe('challengeUrl', () => {
  it('is the well-known challenge path on the origin', () => {
    expect(challengeUrl(ORIGIN)).toBe(`${ORIGIN}/.well-known/ghost-app/challenge`);
    expect(challengeUrl('http://localhost:8787')).toBe(
      'http://localhost:8787/.well-known/ghost-app/challenge',
    );
  });
});

describe('createChallenge', () => {
  it('names its purpose, the origin and a fresh nonce of 32 bytes', () => {
    const challenge = JSON.parse(createChallenge(`${ORIGIN}/`));
    expect(challenge).toEqual({
      purpose: CHALLENGE_PURPOSE,
      origin: ORIGIN,
      nonce: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
    });
    expect(Buffer.from(challenge.nonce, 'base64url')).toHaveLength(32);
  });

  it('never repeats a nonce', () => {
    const nonces = new Set(
      Array.from({ length: 50 }, () => JSON.parse(createChallenge(ORIGIN)).nonce),
    );
    expect(nonces.size).toBe(50);
  });
});

describe('answerChallenge', () => {
  it('signs the exact bytes of a challenge for its own origin', async () => {
    const challenge = createChallenge(ORIGIN);
    const answer = JSON.parse(await answerOf(challenge));
    expect(answer).toEqual({ signature: expect.any(String) });
    const [, payload] = answer.signature.split('.');
    expect(Buffer.from(payload, 'base64url').toString()).toBe(challenge);
  });

  // Otherwise whoever took over a name the app used to serve could relay Ghost's challenge
  // for it to the real backend.
  it('refuses a challenge for another origin than the one it arrived at', async () => {
    const result = await answerChallenge(createChallenge('https://evil.example'), {
      backendKey: backend.privateKey,
      requestUrl: `${ORIGIN}/.well-known/ghost-app/challenge`,
    });
    expect(result).toEqual({
      success: false,
      error: `The challenge is for https://evil.example, but arrived at ${ORIGIN}`,
    });
  });

  it('compares origins, so the port and scheme count', async () => {
    for (const requestUrl of [
      'https://podcast.example.com:8443/.well-known/ghost-app/challenge',
      'http://podcast.example.com/.well-known/ghost-app/challenge',
      new URL('https://audio.example.org/.well-known/ghost-app/challenge'),
    ]) {
      expect(
        (
          await answerChallenge(createChallenge(ORIGIN), {
            backendKey: backend.privateKey,
            requestUrl,
          })
        ).success,
      ).toBe(false);
    }
  });

  it('refuses when it can’t tell where the request arrived', async () => {
    expect(
      await answerChallenge(createChallenge(ORIGIN), {
        backendKey: backend.privateKey,
        requestUrl: '/.well-known/ghost-app/challenge',
      }),
    ).toEqual({
      success: false,
      error: `The challenge is for ${ORIGIN}, but arrived at an unknown origin`,
    });
  });

  it('refuses anything but a challenge', async () => {
    for (const body of [
      'nonce',
      '{}',
      JSON.stringify({ purpose: 'login', origin: ORIGIN, nonce: 'a' }),
    ]) {
      expect(
        await answerChallenge(body, { backendKey: backend.privateKey, requestUrl: ORIGIN }),
      ).toEqual({ success: false, error: 'Expected a challenge of {purpose, origin, nonce}' });
    }
  });
});

describe('verifyChallengeAnswer', () => {
  it('accepts an answer signed with the backend key over the challenge sent', async () => {
    const challenge = createChallenge(ORIGIN);
    expect(
      await verifyChallengeAnswer(challenge, await answerOf(challenge), backend.publicJwk),
    ).toEqual({ success: true });
  });

  it('refuses an answer signed with another key', async () => {
    const challenge = createChallenge(ORIGIN);
    expect(
      await verifyChallengeAnswer(challenge, await answerOf(challenge, other), backend.publicJwk),
    ).toEqual({ success: false, error: 'The signature was not made with backend_key' });
  });

  it('refuses an answer to another challenge', async () => {
    const answer = await answerOf(createChallenge(ORIGIN));
    expect(await verifyChallengeAnswer(createChallenge(ORIGIN), answer, backend.publicJwk)).toEqual(
      { success: false, error: 'The signature is not over the challenge that was sent' },
    );
  });

  // The bytes are compared, never re-read as JSON, so nothing about them can be reinterpreted.
  it('refuses a signature over the same challenge written differently', async () => {
    const challenge = createChallenge(ORIGIN);
    const reordered = JSON.stringify(
      Object.entries(JSON.parse(challenge))
        .reverse()
        .reduce((out, [key, value]) => ({ ...out, [key]: value }), {}),
    );
    const signature = await new CompactSign(new TextEncoder().encode(reordered))
      .setProtectedHeader({ alg: 'Ed25519' })
      .sign(backend.privateKey);
    expect(
      await verifyChallengeAnswer(challenge, JSON.stringify({ signature }), backend.publicJwk),
    ).toEqual({ success: false, error: 'The signature is not over the challenge that was sent' });
  });

  it.each(['', 'signature', '{}', '{"signature": 42}', '"eyJ"'])(
    'refuses an answer of %j',
    async (answer) => {
      expect(
        await verifyChallengeAnswer(createChallenge(ORIGIN), answer, backend.publicJwk),
      ).toEqual({ success: false, error: 'Expected an answer of {"signature": "<compact JWS>"}' });
    },
  );

  it('refuses a signature over bytes that aren’t text', async () => {
    const signature = await new CompactSign(new Uint8Array([0xff]))
      .setProtectedHeader({ alg: 'Ed25519' })
      .sign(backend.privateKey);
    expect(
      await verifyChallengeAnswer(
        createChallenge(ORIGIN),
        JSON.stringify({ signature }),
        backend.publicJwk,
      ),
    ).toEqual({ success: false, error: 'The signature is not over the challenge that was sent' });
  });

  it('refuses a key that isn’t an Ed25519 public key', async () => {
    const challenge = createChallenge(ORIGIN);
    expect(
      await verifyChallengeAnswer(challenge, await answerOf(challenge), {
        ...backend.publicJwk,
        x: 'AQAB',
      }),
    ).toEqual({ success: false, error: 'backend_key is not a usable Ed25519 key' });
  });

  it('refuses a signature that isn’t a JWS', async () => {
    expect(
      await verifyChallengeAnswer(
        createChallenge(ORIGIN),
        JSON.stringify({ signature: 'not.a.jws' }),
        backend.publicJwk,
      ),
    ).toEqual({ success: false, error: 'Expected a protected header of {"alg":"Ed25519"}' });
  });

  // Any other member could change how the signature is checked, or name another key.
  it.each([
    { name: 'a type', header: { typ: 'JWT' } },
    { name: 'a key ID', header: { kid: 'main' } },
    { name: 'its own key', header: { jwk: { kty: 'OKP', crv: 'Ed25519', x: 'AQAB' } } },
  ])('refuses a header with $name, though validly signed', async ({ header }) => {
    const challenge = createChallenge(ORIGIN);
    const signature = await new CompactSign(new TextEncoder().encode(challenge))
      .setProtectedHeader({ alg: 'Ed25519', ...header })
      .sign(backend.privateKey);
    expect(
      await verifyChallengeAnswer(challenge, JSON.stringify({ signature }), backend.publicJwk),
    ).toEqual({ success: false, error: 'Expected a protected header of {"alg":"Ed25519"}' });
  });
});
