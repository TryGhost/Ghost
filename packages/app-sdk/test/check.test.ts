// @vitest-environment node
import dns from 'node:dns';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { signManifest } from '@tryghost/app-contracts/identity';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { CHALLENGE_PATH, handleChallenge } from '../src/backend/index.ts';
import {
  checkApp,
  generateKey,
  publicKeyOf,
  signAppManifest,
  type PrivateKeyJwk,
} from '../src/tooling/index.ts';
import { SOURCE } from './helpers.ts';

async function toRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
  });
}

/**
 * An app on localhost, as an app's backend would serve it: the signed manifest, and the
 * challenge answered by `handleChallenge`. Each test sets what it serves.
 */
let server: Server;
let origin: string;
let app: {
  manifest: (manifestUrl: string) => Promise<unknown>;
  backendKey: PrivateKeyJwk;
  challengeStatus?: number;
};

beforeAll(async () => {
  server = createServer((req, res) => {
    void (async () => {
      const request = await toRequest(req);
      let response: Response;
      if (req.url === '/ghost-app.json') {
        // Signed for the host it was asked for, which may be a name under `.localhost`.
        response = Response.json(await app.manifest(new URL(req.url, request.url).href));
      } else if (req.url === '/moved.json') {
        response = new Response(null, {
          status: 301,
          headers: { location: 'https://elsewhere.example/ghost-app.json' },
        });
      } else if (req.url === '/utf8.json') {
        // A Location of raw UTF-8 bytes, as a server sends a path outside ASCII unescaped.
        response = new Response(null, {
          status: 301,
          headers: { location: Buffer.from('/ghost-app-ü.json').toString('latin1') },
        });
      } else if (req.url === '/ghost-app-%C3%BC.json') {
        response = Response.json(await app.manifest(`${origin}/utf8.json`));
      } else if (req.url === CHALLENGE_PATH && !app.challengeStatus) {
        response = await handleChallenge(request, { backendKey: app.backendKey });
      } else {
        response = new Response('Not found', { status: app.challengeStatus ?? 404 });
      }
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    })();
  });
  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });
  origin = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(
  () =>
    new Promise((resolve) => {
      server.close(resolve);
    }),
);

const identityKey = generateKey();

/** Serves a manifest signed with `identityKey`, naming `backendKey`. */
function serveSigned(backendKey: PrivateKeyJwk, { signFor }: { signFor?: string } = {}) {
  app = {
    backendKey,
    manifest: async (manifestUrl) => {
      const result = await signAppManifest(SOURCE, {
        manifestUrl: signFor ?? manifestUrl,
        identityKey,
        backendKey,
        development: true,
      });
      if (!result.success) {
        throw new Error(JSON.stringify(result.errors));
      }
      return result.signed;
    },
  };
}

describe('checkApp, against an app on localhost', () => {
  beforeEach(() => serveSigned(generateKey()));

  it('passes an app Ghost would install', async () => {
    const result = await checkApp(`${origin}/ghost-app.json`);
    expect(result).toMatchObject({
      success: true,
      manifestUrl: `${origin}/ghost-app.json`,
      manifest: { id: 'com.example.hello', name: 'Hello', development: true },
    });
  });

  it('follows a Location in raw UTF-8, which Ghost reads as UTF-8', async () => {
    expect((await checkApp(`${origin}/utf8.json`)).success).toBe(true);
  });

  it('fails an unsigned manifest', async () => {
    app.manifest = async () => SOURCE;
    expect(await checkApp(`${origin}/ghost-app.json`)).toMatchObject({
      success: false,
      code: 'APP_MANIFEST_UNSIGNED',
      message: 'The app’s manifest is not signed.',
    });
  });

  it('fails a manifest signed for another address', async () => {
    serveSigned(generateKey(), { signFor: 'http://localhost:1/ghost-app.json' });
    const result = await checkApp(`${origin}/ghost-app.json`);
    expect(result).toMatchObject({
      success: false,
      code: 'APP_MANIFEST_URL_MISMATCH',
      message: 'The app’s manifest is for another address.',
    });
    expect(!result.success && result.detail).toContain(`Expected ${origin}/ghost-app.json`);
  });

  it('fails a manifest signed with another key than the one it names', async () => {
    const backendKey = generateKey();
    app.manifest = async (manifestUrl) => {
      const manifest = {
        ...SOURCE,
        manifest_url: manifestUrl,
        identity_key: publicKeyOf(identityKey),
        backend_key: publicKeyOf(backendKey),
        development: true,
      };
      return signManifest(manifest, generateKey());
    };
    const result = await checkApp(`${origin}/ghost-app.json`);
    expect(result).toMatchObject({ success: false, code: 'APP_MANIFEST_SIGNATURE_INVALID' });
    expect(!result.success && result.detail).toContain(
      'The signature was not made with identity_key',
    );
  });

  it('fails an app whose backend answers with another key', async () => {
    serveSigned(generateKey());
    app.backendKey = generateKey();
    const result = await checkApp(`${origin}/ghost-app.json`);
    expect(result).toMatchObject({
      success: false,
      code: 'APP_CHALLENGE_FAILED',
      message: 'Ghost couldn’t confirm the app comes from its developer.',
    });
    expect(!result.success && result.detail).toContain(
      'The signature was not made with backend_key',
    );
  });

  it("fails an app that doesn't answer the challenge", async () => {
    app.challengeStatus = 404;
    const result = await checkApp(`${origin}/ghost-app.json`);
    expect(result).toMatchObject({ success: false, code: 'APP_CHALLENGE_UNREACHABLE' });
    expect(!result.success && result.detail).toContain('answered the challenge with HTTP 404');
  });

  it('fails a manifest that redirects to another host', async () => {
    expect(await checkApp(`${origin}/moved.json`)).toMatchObject({
      success: false,
      code: 'APP_MANIFEST_REDIRECTED',
    });
  });

  it('fails a manifest that is not there, or an app that is not running', async () => {
    expect(await checkApp(`${origin}/missing.json`)).toMatchObject({
      success: false,
      code: 'APP_MANIFEST_UNREACHABLE',
      message: 'Could not load the app’s manifest.',
      detail: `${origin}/missing.json answered with HTTP 404`,
    });
    expect(await checkApp('http://localhost:1/ghost-app.json')).toMatchObject({
      success: false,
      code: 'APP_MANIFEST_UNREACHABLE',
    });
  });

  it('fails an address Ghost would never fetch', async () => {
    expect(await checkApp('http://example.com/ghost-app.json')).toMatchObject({
      success: false,
      code: 'APP_MANIFEST_URL_INVALID',
    });
  });
});

describe('checkApp', () => {
  const MANIFEST_URL = 'http://localhost/ghost-app.json';
  const backendKey = generateKey();
  // Signed as is, so a test can sign a manifest the tooling would refuse to.
  const signed = (changes: object = {}) =>
    signManifest(
      {
        ...SOURCE,
        ...changes,
        manifest_url: MANIFEST_URL,
        identity_key: publicKeyOf(identityKey),
        backend_key: publicKeyOf(backendKey),
        development: true,
      },
      identityKey,
    );

  /** A fetch that answers from `routes`, by URL, and 404 for anything else. */
  function fakeApp(
    routes: Record<string, (request: Request) => Response | Promise<Response>>,
  ): typeof fetch {
    return async (input, init) => {
      const request = new Request(input, init);
      const route = routes[request.url];
      return route ? route(request) : new Response('Not found', { status: 404 });
    };
  }

  const challengeRoute = {
    [`http://localhost${CHALLENGE_PATH}`]: (request: Request) =>
      handleChallenge(request, { backendKey }),
  };

  it('follows a redirect from HTTP to HTTPS on the same host, as Ghost does', async () => {
    const result = await checkApp(MANIFEST_URL, {
      fetch: fakeApp({
        [MANIFEST_URL]: () => Response.redirect('https://localhost/ghost-app.json', 301),
        'https://localhost/ghost-app.json': async () => Response.json(await signed()),
        ...challengeRoute,
      }),
    });
    expect(result).toMatchObject({ success: true, manifestUrl: MANIFEST_URL });
  });

  it('drops credentials from a redirect, as Ghost does', async () => {
    const result = await checkApp(MANIFEST_URL, {
      fetch: fakeApp({
        [MANIFEST_URL]: () =>
          Response.redirect('https://user:secret@localhost/ghost-app.json', 301),
        'https://localhost/ghost-app.json': async () => Response.json(await signed()),
        ...challengeRoute,
      }),
    });
    expect(result).toMatchObject({ success: true, manifestUrl: MANIFEST_URL });
  });

  it('gives the whole read of the manifest one deadline, redirects included, as Ghost does', async () => {
    const signals: AbortSignal[] = [];
    const recording =
      (inner: typeof fetch): typeof fetch =>
      (input, init) => {
        signals.push(init!.signal!);
        return inner(input, init);
      };
    const result = await checkApp(MANIFEST_URL, {
      fetch: recording(
        fakeApp({
          [MANIFEST_URL]: () => Response.redirect('http://localhost/moved.json', 302),
          'http://localhost/moved.json': () =>
            Response.redirect('https://localhost/ghost-app.json', 307),
          'https://localhost/ghost-app.json': async () => Response.json(await signed()),
          ...challengeRoute,
        }),
      ),
    });
    expect(result.success).toBe(true);
    const [first, second, third, challenge] = signals;
    expect(second).toBe(first);
    expect(third).toBe(first);
    // The challenge is a read of its own.
    expect(challenge).not.toBe(first);
  });

  it.each([
    [
      'breaks',
      () =>
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.error(new Error('connection reset'));
          },
        }),
    ],
    // Never ends: reading it would wait out the deadline.
    ['stalls', () => new ReadableStream<Uint8Array>({ pull: () => new Promise(() => {}) })],
  ])('follows a redirect whose body %s without reading it, as Ghost does', async (_name, body) => {
    const result = await checkApp(MANIFEST_URL, {
      fetch: fakeApp({
        [MANIFEST_URL]: () =>
          new Response(body(), {
            status: 301,
            headers: { location: 'https://localhost/ghost-app.json' },
          }),
        'https://localhost/ghost-app.json': async () => Response.json(await signed()),
        ...challengeRoute,
      }),
    });
    expect(result.success).toBe(true);
  });

  it.each([300, 304, 305])(
    'refuses HTTP %i with a Location on another host, as Ghost does',
    async (status) => {
      const result = await checkApp(MANIFEST_URL, {
        fetch: fakeApp({
          [MANIFEST_URL]: () =>
            new Response(null, {
              status,
              headers: { location: 'https://elsewhere.example/ghost-app.json' },
            }),
        }),
      });
      expect(result).toMatchObject({
        success: false,
        code: 'APP_MANIFEST_REDIRECTED',
        detail: `${MANIFEST_URL} redirects to elsewhere.example`,
      });
    },
  );

  it('treats a redirect with an empty Location as an answer, as Ghost does', async () => {
    let requests = 0;
    const result = await checkApp(MANIFEST_URL, {
      fetch: fakeApp({
        [MANIFEST_URL]: () => {
          requests += 1;
          return new Response(null, { status: 302, headers: { location: '' } });
        },
      }),
    });
    expect(result).toMatchObject({
      success: false,
      code: 'APP_MANIFEST_UNREACHABLE',
      detail: `${MANIFEST_URL} answered with HTTP 302`,
    });
    expect(requests).toBe(1);
  });

  it.each([300, 304, 305])(
    'treats HTTP %i as an answer, not a redirect, as Ghost does',
    async (status) => {
      const result = await checkApp(MANIFEST_URL, {
        fetch: fakeApp({
          [MANIFEST_URL]: () =>
            new Response(null, {
              status,
              headers: { location: 'https://localhost/ghost-app.json' },
            }),
          'https://localhost/ghost-app.json': async () => Response.json(await signed()),
        }),
      });
      expect(result).toMatchObject({
        success: false,
        code: 'APP_MANIFEST_UNREACHABLE',
        detail: `${MANIFEST_URL} answered with HTTP ${status}`,
      });
    },
  );

  it.each([
    [
      'a Location that is not a URL',
      () => new Response(null, { status: 302, headers: { location: 'http://[' } }),
      'and a Location that is not a URL',
    ],
    [
      'a redirect to itself',
      () => Response.redirect(MANIFEST_URL, 302),
      'redirects more than 3 times',
    ],
    [
      'a failed request',
      () => {
        throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } });
      },
      'fetch failed (ECONNREFUSED)',
    ],
    [
      'a request that fails with nothing to say',
      () => {
        // As an injected fetch may.
        throw null;
      },
      `${MANIFEST_URL}: null`,
    ],
  ])('reports %s as unreachable', async (_name, route, detail) => {
    const result = await checkApp(MANIFEST_URL, { fetch: fakeApp({ [MANIFEST_URL]: route }) });
    expect(result).toMatchObject({ success: false, code: 'APP_MANIFEST_UNREACHABLE' });
    expect(!result.success && result.detail).toContain(detail);
  });

  it.each([
    ['says it is', () => new Response('{}', { headers: { 'content-length': String(200_000) } })],
    ['is', () => new Response('x'.repeat(100_000))],
  ])('refuses a manifest that %s too large', async (_name, route) => {
    expect(
      await checkApp(MANIFEST_URL, { fetch: fakeApp({ [MANIFEST_URL]: route }) }),
    ).toMatchObject({
      code: 'APP_MANIFEST_TOO_LARGE',
    });
  });

  it('refuses a manifest that is not JSON', async () => {
    expect(
      await checkApp(MANIFEST_URL, {
        fetch: fakeApp({ [MANIFEST_URL]: () => new Response('<html>') }),
      }),
    ).toMatchObject({ code: 'APP_MANIFEST_NOT_JSON' });
  });

  // Ghost decodes with Buffer#toString, which keeps a byte order mark, and its JSON parse of the
  // manifest takes off one.
  it('reads a byte order mark as Ghost does: one on the manifest, none on the answer', async () => {
    const withBom = (count: number) => async () =>
      new Response(`${'\uFEFF'.repeat(count)}${JSON.stringify(await signed())}`);
    expect(
      await checkApp(MANIFEST_URL, {
        fetch: fakeApp({ [MANIFEST_URL]: withBom(1), ...challengeRoute }),
      }),
    ).toMatchObject({ success: true });
    expect(
      await checkApp(MANIFEST_URL, {
        fetch: fakeApp({ [MANIFEST_URL]: withBom(2), ...challengeRoute }),
      }),
    ).toMatchObject({ code: 'APP_MANIFEST_NOT_JSON' });

    const result = await checkApp(MANIFEST_URL, {
      fetch: fakeApp({
        [MANIFEST_URL]: withBom(0),
        [`http://localhost${CHALLENGE_PATH}`]: async (request) =>
          new Response(`\uFEFF${await (await handleChallenge(request, { backendKey })).text()}`),
      }),
    });
    expect(result).toMatchObject({ success: false, code: 'APP_CHALLENGE_FAILED' });
  });

  it('lists every problem with a signed manifest Ghost would refuse', async () => {
    const result = await checkApp(MANIFEST_URL, {
      fetch: fakeApp({
        [MANIFEST_URL]: async () => Response.json(await signed({ accent_color: 'red' })),
      }),
    });
    expect(result).toMatchObject({
      success: false,
      code: 'APP_MANIFEST_INVALID',
      errors: [{ path: 'accent_color', message: 'Expected a hex colour such as #ff5500' }],
    });
  });

  it.each([
    [
      'a failed request',
      () => {
        throw new TypeError('fetch failed');
      },
      'APP_CHALLENGE_UNREACHABLE',
      'challenge: fetch failed',
    ],
    [
      'a request that fails with nothing to say',
      () => {
        // As an injected fetch may.
        throw undefined;
      },
      'APP_CHALLENGE_UNREACHABLE',
      'challenge: undefined',
    ],
    [
      'a redirect',
      () => Response.redirect('https://localhost/', 302),
      'APP_CHALLENGE_UNREACHABLE',
      'HTTP 302 (Ghost follows no redirect for a challenge)',
    ],
    [
      'an answer larger than 4 KB',
      () => new Response('x'.repeat(5000)),
      'APP_CHALLENGE_FAILED',
      'The answer is larger than 4 KB',
    ],
    // What handleChallenge says when the platform reports another origin than Ghost challenged.
    [
      "the backend's refusal",
      (request: Request) =>
        handleChallenge(new Request('http://127.0.0.1/', request), { backendKey }),
      'APP_CHALLENGE_UNREACHABLE',
      'HTTP 400: {"error":"The challenge is for http://localhost, but arrived at http://127.0.0.1"}',
    ],
  ])('reports %s to the challenge', async (_name, route, code, detail) => {
    const result = await checkApp(MANIFEST_URL, {
      fetch: fakeApp({
        [MANIFEST_URL]: async () => Response.json(await signed()),
        [`http://localhost${CHALLENGE_PATH}`]: route,
      }),
    });
    expect(result).toMatchObject({ success: false, code });
    expect(!result.success && result.detail).toContain(detail);
  });

  it("throws a mistake of the caller's rather than blaming the app", async () => {
    // A URL object where a string belongs, which Ghost never passes.
    await expect(checkApp(new URL(MANIFEST_URL) as never)).rejects.toThrow(TypeError);
  });
});

describe('checkApp, against an app on a name under .localhost', () => {
  beforeEach(() => serveSigned(generateKey()));
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reaches the app where the system doesn't know the name, as Ghost in development does", async () => {
    // A system whose resolver knows `localhost` but no name under it, as on Windows.
    const { lookup } = dns;
    const asked: string[] = [];
    vi.spyOn(dns, 'lookup').mockImplementation(((
      hostname: string,
      options: dns.LookupOptions,
      callback: (error: Error | null) => void,
    ) => {
      asked.push(hostname);
      if (hostname === 'localhost') {
        return lookup(hostname, options, callback);
      }
      callback(
        Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), { code: 'ENOTFOUND' }),
      );
    }) as typeof dns.lookup);
    const manifestUrl = `${origin.replace('//localhost', '//my-app.localhost')}/ghost-app.json`;
    expect(await checkApp(manifestUrl)).toMatchObject({ success: true, manifestUrl });
    expect(asked).toContain('my-app.localhost');
  });
});
