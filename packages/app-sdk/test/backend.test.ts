// @vitest-environment node
import { generateKeyPairSync } from 'node:crypto';

import { createChallenge, verifyChallengeAnswer } from '@tryghost/app-contracts/identity';
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';

import {
  CHALLENGE_PATH,
  allowFraming,
  createAdminApiClient,
  createAdminApiToken,
  handleChallenge,
  serveManifest,
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

// A key as Ghost makes one for a custom integration.
const ADMIN_API_KEY = `${'6'.repeat(24)}:${'a1'.repeat(32)}`;

describe('createAdminApiToken', () => {
  // As Ghost core's Admin API key authentication verifies a token, for a request to
  // /ghost/api/admin/…, with the key's secret decoded from hex.
  function verifyAsGhost(token: string) {
    const decoded = jwt.decode(token, { complete: true });
    expect(decoded?.header.kid).toBe('6'.repeat(24));
    return jwt.verify(token, Buffer.from('a1'.repeat(32), 'hex'), {
      algorithms: ['HS256'],
      maxAge: '5m',
      audience: /\/?admin\/?$/,
    });
  }

  it('signs a token Ghost accepts', async () => {
    const payload = verifyAsGhost(await createAdminApiToken(ADMIN_API_KEY));
    expect(payload).toMatchObject({ aud: '/admin/' });
  });

  it('is valid for 5 minutes', async () => {
    const now = Date.parse('2026-11-04T12:00:00Z');
    const token = await createAdminApiToken(ADMIN_API_KEY, { now });
    const { iat, exp } = jwt.decode(token) as { iat: number; exp: number };
    expect([iat, exp]).toEqual([now / 1000, now / 1000 + 300]);

    vi.useFakeTimers({ now: now + 4 * 60 * 1000, toFake: ['Date'] });
    try {
      expect(() => verifyAsGhost(token)).not.toThrow();
      vi.setSystemTime(now + 6 * 60 * 1000);
      expect(() => verifyAsGhost(token)).toThrow();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['', 'abc', `${'6'.repeat(24)}:${'z'.repeat(64)}`, `${'6'.repeat(24)}${'a'.repeat(64)}`])(
    'refuses %j, which is not an Admin API key',
    async (key) => {
      await expect(createAdminApiToken(key)).rejects.toThrow(TypeError);
    },
  );
});

describe('createAdminApiClient', () => {
  function client(url = 'https://site.example') {
    const requests: Request[] = [];
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new Request(input, init));
      return new Response('{}');
    });
    return { api: createAdminApiClient({ url, key: ADMIN_API_KEY, fetch }), requests };
  }

  it('calls the Admin API with a token for each request', async () => {
    const { api, requests } = client();
    await api.fetch('/posts/?limit=5', {
      headers: { authorization: 'Basic nope', 'x-custom': '1' },
    });

    const [request] = requests;
    expect(request?.url).toBe('https://site.example/ghost/api/admin/posts/?limit=5');
    expect(request?.headers.get('x-custom')).toBe('1');
    const [scheme, token] = request?.headers.get('authorization')?.split(' ') ?? [];
    expect(scheme).toBe('Ghost');
    expect(jwt.decode(token!)).toMatchObject({ aud: '/admin/' });
  });

  it('resolves paths under a site with a subdirectory', async () => {
    const { api, requests } = client('https://example.com/blog');
    expect(api.root).toBe('https://example.com/blog/ghost/api/admin/');
    await api.fetch('/site/', { method: 'GET' });
    expect(requests[0]?.url).toBe('https://example.com/blog/ghost/api/admin/site/');
  });

  it.each([
    'https://other.example/posts/',
    '//other.example/posts/',
    'posts/',
    '/../content/posts/',
    '/%2e%2e/content/',
    '/posts\\..\\',
  ])('refuses %s, which is not an Admin API path', async (path) => {
    const { api, requests } = client();
    await expect(api.fetch(path)).rejects.toThrow(TypeError);
    expect(requests).toEqual([]);
  });

  it('refuses a key or URL that is not one when it is made', () => {
    expect(() => createAdminApiClient({ url: 'https://site.example', key: 'nope' })).toThrow(
      TypeError,
    );
    expect(() => createAdminApiClient({ url: 'site.example', key: ADMIN_API_KEY })).toThrow(
      TypeError,
    );
  });
});
