// @vitest-environment node
import { generateKeyPairSync } from 'node:crypto';

import { createChallenge, verifyChallengeAnswer } from '@tryghost/app-contracts/identity';
import { describe, expect, it, vi } from 'vitest';

import {
  CHALLENGE_PATH,
  allowFraming,
  handleChallenge,
  serveManifest,
  type SignedManifest,
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
  const page = () => new Response('<p>Hi</p>', { headers: { 'x-frame-options': 'DENY' } });

  it("answers Ghost's challenge itself, without calling fetch", async () => {
    const fetch = vi.fn(page);
    const app = withGhostApp({
      backendKey: privateJwk,
      fetch,
      adminOrigins: ['https://site.example'],
    });
    const challenge = createChallenge(ORIGIN);
    const response = await app.fetch(challengeRequest(challenge));

    expect(response.status).toBe(200);
    expect(response.headers.has('content-security-policy')).toBe(false);
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

    // Without adminOrigins, the response is passed on as it is.
    expect(await app.fetch(request, env, 1)).toBe(response);
    expect(fetch).toHaveBeenCalledWith(request, env, 1);
  });

  it("lets only the given Admin origins frame fetch's responses", async () => {
    const app = withGhostApp({
      backendKey: privateJwk,
      fetch: page,
      adminOrigins: ['https://site.example'],
    });
    const framed = await app.fetch(new Request(`${ORIGIN}/`));

    expect(framed.headers.get('content-security-policy')).toBe(
      'frame-ancestors https://site.example',
    );
    expect(framed.headers.has('x-frame-options')).toBe(false);
    expect(await framed.text()).toBe('<p>Hi</p>');
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

  it.each([
    ['a member missing', { protected: 'p', payload: 'q' }],
    ['another member', { ...signed, header: {} }],
    ['a member that is not text', { ...signed, signature: 1 }],
  ])('refuses an object with %s, which Ghost would', (_name, input) => {
    expect(() => serveManifest(input as unknown as SignedManifest)).toThrow(
      new TypeError(
        'Expected a signed manifest, with only protected, payload and signature, or its text',
      ),
    );
  });
});

describe('allowFraming', () => {
  it('lets only the given Admin origins frame the page, and drops X-Frame-Options', async () => {
    const page = new Response('<p>Hi</p>', {
      status: 201,
      headers: { 'x-frame-options': 'DENY', 'content-type': 'text/html' },
    });
    const framed = allowFraming(page, {
      adminOrigins: ['https://site.example', 'https://admin.example/'],
    });
    expect(framed.status).toBe(201);
    expect(framed.headers.get('content-security-policy')).toBe(
      'frame-ancestors https://site.example https://admin.example',
    );
    expect(framed.headers.has('x-frame-options')).toBe(false);
    expect(framed.headers.get('content-type')).toBe('text/html');
    expect(await framed.text()).toBe('<p>Hi</p>');
  });

  it("keeps the rest of the page's policy, replacing any frame-ancestors it had", () => {
    const page = new Response(null, {
      headers: {
        'content-security-policy': "default-src 'self'; frame-ancestors 'none'; img-src *",
      },
    });
    expect(
      allowFraming(page, { adminOrigins: ['https://site.example'] }).headers.get(
        'content-security-policy',
      ),
    ).toBe("default-src 'self'; img-src *; frame-ancestors https://site.example");
  });

  it.each(['http://[::1]:2368', 'https://[2001:db8::1]'])(
    "refuses %s, an IPv6 address a policy can't name",
    (origin) => {
      expect(() => allowFraming(new Response(), { adminOrigins: [origin] })).toThrow(
        "frame-ancestors can't name an IPv6 address",
      );
    },
  );

  it('accepts an origin in any case the URL parser reads as one', () => {
    const framed = allowFraming(new Response(), { adminOrigins: ['HTTPS://Site.Example:443'] });
    expect(framed.headers.get('content-security-policy')).toBe(
      'frame-ancestors https://site.example',
    );
  });

  it("drops each of several policies' frame-ancestors, and keeps everything else", () => {
    const page = new Response(null, {
      headers: [
        ['content-security-policy', "script-src 'none'; frame-ancestors 'none'"],
        ['content-security-policy', "default-src 'self'"],
        ['content-security-policy', "frame-ancestors 'self'"],
      ],
    });
    expect(
      allowFraming(page, { adminOrigins: ['https://site.example'] }).headers.get(
        'content-security-policy',
      ),
    ).toBe("script-src 'none'; frame-ancestors https://site.example, default-src 'self'");
  });

  it('passes on a response it cannot copy, such as an error or an upgrade, as it is', () => {
    const error = Response.error();
    expect(allowFraming(error, { adminOrigins: ['https://site.example'] })).toBe(error);
    // As a platform's WebSocket upgrade answers, which a Response can't be constructed with.
    const upgrade = Object.defineProperty(new Response(null), 'status', { value: 101 });
    expect(allowFraming(upgrade, { adminOrigins: ['https://site.example'] })).toBe(upgrade);
  });

  it('works on a response whose headers are immutable, as fetch returns them', () => {
    const fetched = Response.redirect('https://app.example/', 302);
    expect(() => fetched.headers.set('x', 'y')).toThrow();
    expect(allowFraming(fetched, { adminOrigins: [] }).headers.get('content-security-policy')).toBe(
      "frame-ancestors 'none'",
    );
  });

  it.each([
    'https://site.example/ghost/',
    'site.example',
    "https://site.example; script-src 'unsafe-inline'",
    'https://*.example',
    'ftp://site.example',
    // The URL parser takes these into the host, where they would end a source or a policy.
    'https://a.example;sandbox',
    'https://a.example,b.example',
    'https://a.example%3Bsandbox',
    'https://a.example\tb.example',
  ])('refuses %s, which is not an origin', (origin) => {
    expect(() => allowFraming(new Response(), { adminOrigins: [origin] })).toThrow(TypeError);
  });
});
