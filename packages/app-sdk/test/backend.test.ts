// @vitest-environment node
import { generateKeyPairSync } from 'node:crypto';

import { createChallenge, verifyChallengeAnswer } from '@tryghost/app-contracts/identity';
import { describe, expect, it, vi } from 'vitest';

import {
  CHALLENGE_PATH,
  handleChallenge,
  serveManifest,
  withGhostApp,
} from '../src/backend/index.ts';

const ORIGIN = 'https://app.example';

function backendKeyPair() {
  const { privateKey } = generateKeyPairSync('ed25519');
  const { kty, crv, x, d } = privateKey.export({ format: 'jwk' }) as Record<string, string>;
  return { privateJwk: { kty, crv, x, d }, publicJwk: { kty, crv, x } as const };
}

const challengeRequest = (
  body: string,
  init: RequestInit = {},
  url = `${ORIGIN}${CHALLENGE_PATH}`,
) =>
  new Request(url, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json' },
    ...init,
  });

describe('handleChallenge', () => {
  const { privateJwk, publicJwk } = backendKeyPair();

  it.each([
    ['an object', privateJwk],
    ['JSON, as a secret holds it', JSON.stringify(privateJwk)],
  ])('answers a challenge for its own origin, with the key as %s', async (_name, backendKey) => {
    const challenge = createChallenge(ORIGIN);
    const response = await handleChallenge(challengeRequest(challenge), { backendKey });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^application\/json/);
    expect(response.headers.get('cache-control')).toBe('no-store');
    // Verified as Ghost verifies it, against the public key the manifest names.
    expect(
      await verifyChallengeAnswer(challenge, await response.text(), publicJwk as never),
    ).toEqual({ success: true });
  });

  it('refuses a challenge for another origin', async () => {
    const response = await handleChallenge(
      challengeRequest(createChallenge('https://other.example')),
      { backendKey: privateJwk },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: `The challenge is for https://other.example, but arrived at ${ORIGIN}`,
    });
  });

  it('answers for the public origin it is given, behind a proxy that terminates TLS', async () => {
    const challenge = createChallenge(ORIGIN);
    // The server sees plain HTTP on another host; Ghost challenged the public origin.
    const request = challengeRequest(challenge, {}, `http://10.0.0.5:8080${CHALLENGE_PATH}`);
    expect((await handleChallenge(request, { backendKey: privateJwk })).status).toBe(400);
    const response = await handleChallenge(
      challengeRequest(challenge, {}, `http://10.0.0.5:8080${CHALLENGE_PATH}`),
      { backendKey: privateJwk, origin: ORIGIN },
    );
    expect(response.status).toBe(200);
    expect(
      await verifyChallengeAnswer(challenge, await response.text(), publicJwk as never),
    ).toEqual({
      success: true,
    });
  });

  it.each(['app.example', 'https://app.example/path', 'https://app.example;x'])(
    'throws for an origin that is not one, %s',
    async (origin) => {
      await expect(
        handleChallenge(challengeRequest(createChallenge(ORIGIN)), {
          backendKey: privateJwk,
          origin,
        }),
      ).rejects.toThrow(TypeError);
    },
  );

  it.each([
    ['not JSON', 'nonce'],
    ['JSON that is not a challenge', '{"purpose":"ghost-app-challenge"}'],
  ])('refuses a body that is %s', async (_name, body) => {
    const response = await handleChallenge(challengeRequest(body), { backendKey: privateJwk });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Expected a challenge of {purpose, origin, nonce}',
    });
  });

  it('refuses a body that is not UTF-8', async () => {
    const response = await handleChallenge(
      new Request(`${ORIGIN}${CHALLENGE_PATH}`, { method: 'POST', body: new Uint8Array([0xff]) }),
      { backendKey: privateJwk },
    );
    expect(response.status).toBe(400);
  });

  it('refuses a challenge with no body', async () => {
    const response = await handleChallenge(
      new Request(`${ORIGIN}${CHALLENGE_PATH}`, { method: 'POST' }),
      {
        backendKey: privateJwk,
      },
    );
    expect(response.status).toBe(400);
  });

  it('refuses a body that says it is larger than 4 KB without reading it', async () => {
    const response = await handleChallenge(
      challengeRequest('{}', { headers: { 'content-length': '5000' } }),
      { backendKey: privateJwk },
    );
    expect(response.status).toBe(413);
  });

  it('refuses a body larger than 4 KB without reading it all', async () => {
    const response = await handleChallenge(challengeRequest('x'.repeat(4097)), {
      backendKey: privateJwk,
    });
    expect(response.status).toBe(413);

    let pulled = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        controller.enqueue(new Uint8Array(1024));
      },
    });
    const streamed = await handleChallenge(
      new Request(`${ORIGIN}${CHALLENGE_PATH}`, {
        method: 'POST',
        body: endless,
        duplex: 'half',
      } as RequestInit),
      { backendKey: privateJwk },
    );
    expect(streamed.status).toBe(413);
    expect(pulled).toBeLessThan(10);
  });

  it.each(['GET', 'PUT', 'HEAD'])('refuses %s', async (method) => {
    const response = await handleChallenge(new Request(`${ORIGIN}${CHALLENGE_PATH}`, { method }), {
      backendKey: privateJwk,
    });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  it.each([
    ['not JSON', 'secret'],
    ['a public key', JSON.stringify(publicJwk)],
    ['another kind of key', JSON.stringify({ kty: 'EC', crv: 'P-256', x: 'x', d: 'd' })],
    ['an Ed25519 key that is not one', JSON.stringify({ ...privateJwk, d: 'short' })],
  ])(
    'throws for a backend key that is %s, without saying what it was',
    async (_name, backendKey) => {
      const answering = handleChallenge(challengeRequest(createChallenge(ORIGIN)), { backendKey });
      await expect(answering).rejects.toThrow(TypeError);
      await expect(answering).rejects.not.toThrow(backendKey);
    },
  );
});

describe('withGhostApp', () => {
  const { privateJwk, publicJwk } = backendKeyPair();
  const page = () => new Response('<p>Hi</p>');

  it("answers Ghost's challenge itself, without calling fetch", async () => {
    const fetch = vi.fn(page);
    const app = withGhostApp({ backendKey: privateJwk, fetch });
    const challenge = createChallenge(ORIGIN);
    const response = await app.fetch(challengeRequest(challenge));

    expect(response.status).toBe(200);
    expect(
      await verifyChallengeAnswer(challenge, await response.text(), publicJwk as never),
    ).toEqual({ success: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("passes every other request, and the platform's arguments, to fetch", async () => {
    const response = page();
    const fetch = vi.fn((_request: Request, _env: { name: string }, _ctx: number) => response);
    const app = withGhostApp({ backendKey: privateJwk, fetch });
    const request = new Request(`${ORIGIN}${CHALLENGE_PATH}/more`, { method: 'POST' });
    const env = { name: 'env' };

    expect(await app.fetch(request, env, 1)).toBe(response);
    expect(fetch).toHaveBeenCalledWith(request, env, 1);
  });

  it("answers for the public origin it's given, behind a proxy", async () => {
    const app = withGhostApp({ backendKey: privateJwk, origin: ORIGIN, fetch: page });
    // Behind a proxy that terminates TLS, the server sees http:// and another host.
    const challenge = createChallenge(ORIGIN);
    const response = await app.fetch(
      challengeRequest(challenge, {}, `http://internal:8080${CHALLENGE_PATH}`),
    );

    expect(response.status).toBe(200);
  });
});

describe('serveManifest', () => {
  const signed = { protected: 'p', payload: 'q', signature: 's' };

  it.each([
    ['an object', signed, JSON.stringify(signed)],
    ['text, exactly as it is', ' {"protected":"p"}\n', ' {"protected":"p"}\n'],
  ])('serves %s as JSON that caches revalidate', async (_name, input, body) => {
    const response = serveManifest(input);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-cache');
    expect(await response.text()).toBe(body);
  });
});
