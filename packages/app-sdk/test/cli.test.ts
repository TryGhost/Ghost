// @vitest-environment node
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { signManifest } from '@tryghost/app-contracts/identity';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CHALLENGE_PATH, handleChallenge } from '../src/backend/index.ts';
import { run } from '../src/cli.ts';
import {
  checkApp,
  generateKey,
  publicKeyOf,
  signAppManifest,
  type PrivateKeyJwk,
} from '../src/tooling/index.ts';
import { SOURCE, makeProject, readAsGhost } from './helpers.ts';

/** Runs the CLI, collecting what it prints. */
async function cli(...args: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(args, { out: (text) => out.push(text), err: (text) => err.push(text) });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

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
        response = Response.json(await app.manifest(`${origin}/ghost-app.json`));
      } else if (req.url === '/moved.json') {
        response = new Response(null, {
          status: 301,
          headers: { location: 'https://elsewhere.example/ghost-app.json' },
        });
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

describe('ghost-app check', () => {
  beforeEach(() => serveSigned(generateKey()));

  it('passes an app Ghost would install', async () => {
    const result = await cli('check', `${origin}/ghost-app.json`);
    expect(result).toMatchObject({ code: 0, err: '' });
    expect(result.out).toContain(`OK: Hello (com.example.hello) at ${origin}/ghost-app.json`);
    expect(result.out).toContain('development build');
  });

  it('fails an unsigned manifest', async () => {
    app.manifest = async () => SOURCE;
    const result = await cli('check', `${origin}/ghost-app.json`);
    expect(result.code).toBe(1);
    expect(result.err).toMatch(/^APP_MANIFEST_UNSIGNED: The app’s manifest is not signed\./);
  });

  it('fails a manifest signed for another address', async () => {
    serveSigned(generateKey(), { signFor: 'http://localhost:1/ghost-app.json' });
    const result = await cli('check', `${origin}/ghost-app.json`);
    expect(result.code).toBe(1);
    expect(result.err).toContain(
      'APP_MANIFEST_URL_MISMATCH: The app’s manifest is for another address.',
    );
    expect(result.err).toContain(`Expected ${origin}/ghost-app.json`);
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
    const result = await cli('check', `${origin}/ghost-app.json`);
    expect(result.code).toBe(1);
    expect(result.err).toContain('APP_MANIFEST_SIGNATURE_INVALID');
    expect(result.err).toContain('The signature was not made with identity_key');
  });

  it('fails an app whose backend answers with another key', async () => {
    serveSigned(generateKey());
    app.backendKey = generateKey();
    const result = await cli('check', `${origin}/ghost-app.json`);
    expect(result.code).toBe(1);
    expect(result.err).toContain(
      'APP_CHALLENGE_FAILED: Ghost couldn’t confirm the app comes from its developer.',
    );
    expect(result.err).toContain('The signature was not made with backend_key');
  });

  it("fails an app that doesn't answer the challenge", async () => {
    app.challengeStatus = 404;
    const result = await cli('check', `${origin}/ghost-app.json`);
    expect(result.code).toBe(1);
    expect(result.err).toContain('APP_CHALLENGE_UNREACHABLE');
    expect(result.err).toContain('answered the challenge with HTTP 404');
  });

  it('fails a manifest that redirects to another host', async () => {
    const result = await cli('check', `${origin}/moved.json`);
    expect(result.err).toContain('APP_MANIFEST_REDIRECTED');
  });

  it('fails a manifest that is not there, or an app that is not running', async () => {
    expect((await cli('check', `${origin}/missing.json`)).err).toContain(
      `APP_MANIFEST_UNREACHABLE: Could not load the app’s manifest.\n${origin}/missing.json answered with HTTP 404`,
    );
    expect((await cli('check', 'http://localhost:1/ghost-app.json')).err).toContain(
      'APP_MANIFEST_UNREACHABLE',
    );
  });

  it('fails an address Ghost would never fetch', async () => {
    expect((await cli('check', 'http://example.com/ghost-app.json')).err).toContain(
      'APP_MANIFEST_URL_INVALID',
    );
  });
});

describe('ghost-app keys, sign and backend-key', () => {
  let root: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ root, cleanup } = await makeProject());
  });

  afterEach(() => cleanup());

  it('creates keys, signs with them, and prints the backend key only when asked', async () => {
    expect(await cli('keys', '--dir', root)).toMatchObject({ code: 0, out: '' });
    const production = await cli('keys', '--production', '--dir', root);
    expect(production.err).toContain('Created .ghost-app/production/identity.json');
    expect(production.err).toContain('Keep a copy of the production identity key');
    expect((await cli('keys', '--production', '--dir', root)).err).toContain(
      'Kept .ghost-app/production/identity.json, which already exists',
    );

    const manifestUrl = 'https://hello.example.com/ghost-app.json';
    const signed = await cli('sign', '--url', manifestUrl, '--production', '--dir', root);
    expect(signed.code).toBe(0);
    expect((await readAsGhost(JSON.parse(signed.out), manifestUrl)).development).toBe(false);

    const out = join(root, 'signed.json');
    expect(
      (
        await cli(
          'sign',
          '--url',
          'http://localhost:5173/ghost-app.json',
          '--out',
          out,
          '--dir',
          root,
        )
      ).code,
    ).toBe(0);
    expect(
      (
        await readAsGhost(
          JSON.parse(await readFile(out, 'utf8')),
          'http://localhost:5173/ghost-app.json',
        )
      ).development,
    ).toBe(true);

    // The private keys appear nowhere but where backend-key prints the backend key.
    const identity = JSON.parse(
      await readFile(join(root, '.ghost-app/production/identity.json'), 'utf8'),
    );
    const backend = JSON.parse(
      await readFile(join(root, '.ghost-app/production/backend.json'), 'utf8'),
    );
    expect(signed.out + signed.err + production.err).not.toContain(identity.d);
    expect(signed.out + signed.err + production.err).not.toContain(backend.d);
    expect(JSON.parse((await cli('backend-key', '--production', '--dir', root)).out)).toEqual(
      backend,
    );
  });

  it("writes --out in the project's directory, like --manifest, and says where", async () => {
    await cli('keys', '--dir', root);
    await writeFile(join(root, 'readable.json'), JSON.stringify(SOURCE));
    const result = await cli(
      'sign',
      '--url',
      'http://localhost:5173/ghost-app.json',
      '--manifest',
      'readable.json',
      '--out',
      'public/ghost-app.json',
      '--dir',
      root,
    );
    expect(result.err).toContain(`Wrote ${join(root, 'public/ghost-app.json')}, signed for`);
    expect(existsSync(join(root, 'public/ghost-app.json'))).toBe(true);
  });

  it("prints only the backend key's public half with --public", async () => {
    await cli('keys', '--production', '--dir', root);
    const backend = JSON.parse(
      await readFile(join(root, '.ghost-app/production/backend.json'), 'utf8'),
    );
    const result = await cli('backend-key', '--production', '--public', '--dir', root);
    expect(result).toMatchObject({ code: 0, err: '' });
    expect(JSON.parse(result.out)).toEqual({ kty: 'OKP', crv: 'Ed25519', x: backend.x });
    expect(result.out).not.toContain(backend.d);
  });

  describe('backend-key --check', () => {
    it('prints nothing, and exits with 0, for a key that is there and usable', async () => {
      await cli('keys', '--production', '--dir', root);
      expect(await cli('backend-key', '--production', '--check', '--dir', root)).toEqual({
        code: 0,
        out: '',
        err: '',
      });
    });

    it('says why on stderr, and prints nothing else, for a key that is missing', async () => {
      const result = await cli('backend-key', '--production', '--check', '--dir', root);
      expect(result).toMatchObject({ code: 1, out: '' });
      expect(result.err).toContain("There's no production backend key");
    });

    it("says why, without the key, for one that isn't usable", async () => {
      await cli('keys', '--production', '--dir', root);
      const file = join(root, '.ghost-app/production/backend.json');
      const backend = JSON.parse(await readFile(file, 'utf8'));
      await writeFile(file, JSON.stringify({ ...backend, x: generateKey().x }));
      const result = await cli('backend-key', '--production', '--check', '--dir', root);
      expect(result).toMatchObject({ code: 1, out: '' });
      expect(result.err).toContain("isn't a usable Ed25519 key");
      expect(result.err).not.toContain(backend.d);
    });
  });

  it('reports a manifest that cannot be signed with its problems', async () => {
    await cli('keys', '--dir', root);
    await writeFile(
      join(root, 'ghost-app.json'),
      JSON.stringify({ ...SOURCE, accent_color: 'red' }),
    );
    const result = await cli(
      'sign',
      '--url',
      'http://localhost:5173/ghost-app.json',
      '--dir',
      root,
    );
    expect(result).toMatchObject({ code: 1, out: '' });
    expect(result.err).toContain('APP_MANIFEST_INVALID');
    expect(result.err).toContain('accent_color: Expected a hex colour such as #ff5500');
  });

  it('says how to create a key that is missing', async () => {
    const result = await cli(
      'sign',
      '--url',
      'https://hello.example.com/ghost-app.json',
      '--production',
      '--dir',
      root,
    );
    expect(result.code).toBe(1);
    expect(result.err).toContain(
      'Create one with `ghost-app keys --production`, or set GHOST_APP_IDENTITY_KEY',
    );
    expect((await cli('backend-key', '--dir', root)).err).toContain(
      'Create one with `ghost-app keys`',
    );
  });

  it('shows the usage for a mistake', async () => {
    expect(await cli()).toMatchObject({ code: 2 });
    expect((await cli('check')).err).toContain('check needs the manifest URL');
    expect((await cli('keys', 'extra')).err).toContain('Unexpected extra');
    expect((await cli('keys', '--nope')).err).toContain("Unknown option '--nope'");
    expect((await cli('sign', '--dir', root)).err).toContain('sign needs --url');
    expect((await cli('nope')).err).toContain('Unknown command nope');
    expect((await cli('--help')).out).toContain('Usage: ghost-app');
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

  it('lists every problem with a signed manifest Ghost would refuse, as the CLI prints them', async () => {
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
