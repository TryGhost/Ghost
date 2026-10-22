import assert from 'node:assert/strict';
import { vi } from 'vitest';
import type {
  AppFetchOptions,
  AppFetchResult,
  FetchFromApp,
} from '../../../../../core/server/services/app-installations/fetch-from-app';
import {
  createIdentityChecker,
  type PinnedIdentity,
  type TrustConfig,
} from '../../../../../core/server/services/app-installations/identity-check';
import type { LoadedManifest } from '../../../../../core/server/services/app-installations/load-manifest';
import {
  answerTestChallenge,
  generateTestAppKeys,
  generateTestKey,
  type TestAppKeys,
  type TestKey,
} from '../../../../utils/app-identity';

const MANIFEST_URL = 'https://podcast.example.com/ghost-app.json';
const SURFACE_URL = 'https://app.example.net/admin';

let keys: TestAppKeys;
let other: TestKey;

beforeAll(async function () {
  keys = await generateTestAppKeys();
  other = await generateTestKey();
});

function loaded({
  manifestUrl = MANIFEST_URL,
  surfaceUrl = SURFACE_URL,
}: { manifestUrl?: string; surfaceUrl?: string } = {}): LoadedManifest {
  const manifest = {
    id: 'com.example.podcast',
    name: 'Podcast',
    description: 'Publish episodes.',
    author: { name: 'Example Audio', url: 'https://example.com/' },
    accent_color: '#ff5500',
    icon: { name: 'audio-lines' },
    surfaces: [{ type: 'admin_page' as const, url: surfaceUrl }],
    manifest_url: manifestUrl,
    identity_key: keys.identity.publicJwk,
    backend_key: keys.backend.publicJwk,
    development: false,
  };
  return {
    manifestUrl,
    manifest,
    serialised: JSON.stringify(manifest),
    digest: 'digest',
    identityKeyThumbprint: 'identity',
    backendKeyThumbprint: 'backend',
  };
}

/** How an origin answers a challenge. */
type Backend = (body: string, origin: string) => AppFetchResult | Promise<AppFetchResult>;

const answering =
  (key: TestKey = keys.backend): Backend =>
  async (body, origin) => ({
    success: true,
    url: `${origin}/.well-known/ghost-app/challenge`,
    text: await answerTestChallenge(body, key, [origin]),
  });

const answeringWith =
  (result: AppFetchResult): Backend =>
  () =>
    result;

function setup({
  backends = {},
  trust = { trustedOrigins: [], trustLoopback: false },
}: { backends?: Record<string, Backend>; trust?: TrustConfig } = {}) {
  const fetchFromApp = vi.fn<FetchFromApp>(async (url, options: AppFetchOptions) => {
    const { origin } = new URL(url);
    const backend = backends[origin] ?? answering();
    return backend(options.body!, origin);
  });
  const warn = vi.fn();
  const checkIdentity = createIdentityChecker({
    fetchFromApp,
    logging: { warn },
    getTrustConfig: () => trust,
  });
  return { checkIdentity, fetchFromApp, warn };
}

const pinned = (overrides: Partial<PinnedIdentity> = {}): PinnedIdentity => ({
  identityKeyThumbprint: 'identity',
  retiredBackendKeys: new Set(),
  ...overrides,
});

describe('createIdentityChecker', function () {
  describe('the challenge', function () {
    it('challenges the manifest’s own origin and every surface’s, each once, in parallel', async function () {
      const { checkIdentity, fetchFromApp } = setup();

      const result = await checkIdentity(loaded(), null);

      assert.deepEqual(result, { trustedOrigins: [] });
      assert.deepEqual(
        fetchFromApp.mock.calls.map(([url]) => url),
        [
          'https://podcast.example.com/.well-known/ghost-app/challenge',
          'https://app.example.net/.well-known/ghost-app/challenge',
        ],
      );
    });

    it('challenges an origin the manifest and a surface share only once', async function () {
      const { checkIdentity, fetchFromApp } = setup();

      await checkIdentity(loaded({ surfaceUrl: 'https://podcast.example.com/admin' }), null);

      assert.equal(fetchFromApp.mock.calls.length, 1);
    });

    it('posts a fresh challenge for the origin, refusing redirects and large answers', async function () {
      const { checkIdentity, fetchFromApp } = setup();

      await checkIdentity(loaded(), null);
      await checkIdentity(loaded(), null);

      const [url, options] = fetchFromApp.mock.calls[0];
      assert.equal(url, 'https://podcast.example.com/.well-known/ghost-app/challenge');
      assert.deepEqual(options, {
        maxBytes: 4096,
        method: 'POST',
        body: options.body,
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        redirect: 'error',
      });
      assert.deepEqual(JSON.parse(options.body!), {
        purpose: 'ghost-app-challenge',
        origin: 'https://podcast.example.com',
        nonce: JSON.parse(options.body!).nonce,
      });
      assert.notEqual(options.body, fetchFromApp.mock.calls[2][1].body);
    });

    it('fails when an origin answers with another key', async function () {
      const { checkIdentity } = setup({
        backends: { 'https://app.example.net': answering(other) },
      });

      await assert.rejects(checkIdentity(loaded(), null), {
        errorType: 'ValidationError',
        code: 'APP_CHALLENGE_FAILED',
        context: 'https://app.example.net: The signature was not made with backend_key',
      });
    });

    it('fails when an origin answers with something other than a signature', async function () {
      const { checkIdentity } = setup({
        backends: {
          'https://app.example.net': answeringWith({
            success: true,
            url: SURFACE_URL,
            text: '<html></html>',
          }),
        },
      });

      await assert.rejects(checkIdentity(loaded(), null), {
        code: 'APP_CHALLENGE_FAILED',
        context: 'https://app.example.net: Expected an answer of {"signature": "<compact JWS>"}',
      });
    });

    it('fails when an answer is too large', async function () {
      const { checkIdentity } = setup({
        backends: {
          'https://app.example.net': answeringWith({
            success: false,
            failure: { reason: 'too_large' },
          }),
        },
      });

      await assert.rejects(checkIdentity(loaded(), null), {
        code: 'APP_CHALLENGE_FAILED',
        context: 'https://app.example.net: The answer is larger than 4 KB',
      });
    });

    it('reports an origin that doesn’t answer as unreachable, logging why without saying it', async function () {
      const cause = new Error('Connection failed at a private upstream address');
      const { checkIdentity, warn } = setup({
        backends: {
          'https://app.example.net': answeringWith({
            success: false,
            failure: { reason: 'unreachable', cause },
          }),
        },
      });

      await assert.rejects(checkIdentity(loaded(), null), {
        errorType: 'ValidationError',
        code: 'APP_CHALLENGE_UNREACHABLE',
        context: 'https://app.example.net',
      });
      assert.deepEqual(warn.mock.calls, [
        ['Could not challenge the app at https://app.example.net'],
        [cause],
      ]);
    });

    it('reports an error status, or a redirect, as unreachable with the status', async function () {
      const failures = [
        { reason: 'unreachable', status: 404, cause: 'HTTP' },
        { reason: 'redirect_refused', status: 302 },
      ] as const;
      for (const failure of failures) {
        const { status } = failure;
        const { checkIdentity } = setup({
          backends: {
            'https://app.example.net': answeringWith({ success: false, failure }),
          },
        });

        await assert.rejects(checkIdentity(loaded(), null), {
          code: 'APP_CHALLENGE_UNREACHABLE',
          context: `https://app.example.net answered the challenge with HTTP ${status}`,
        });
      }
    });

    it('reports the first origin that failed, in the manifest’s order', async function () {
      const { checkIdentity } = setup({
        backends: {
          'https://podcast.example.com': answering(other),
          'https://app.example.net': answeringWith({
            success: false,
            failure: { reason: 'unreachable', cause: 'down' },
          }),
        },
      });

      await assert.rejects(checkIdentity(loaded(), null), { code: 'APP_CHALLENGE_FAILED' });
    });
  });

  describe('trusted origins', function () {
    it('skips the challenge for an origin the site trusts, as the URL parser reads it, and reports it', async function () {
      const { checkIdentity, fetchFromApp } = setup({
        trust: { trustedOrigins: ['https://APP.example.net/'], trustLoopback: false },
      });

      const result = await checkIdentity(loaded(), null);

      assert.deepEqual(result, { trustedOrigins: ['https://app.example.net'] });
      assert.deepEqual(
        fetchFromApp.mock.calls.map(([url]) => url),
        ['https://podcast.example.com/.well-known/ghost-app/challenge'],
      );
    });

    // An app without a backend can only be installed if its manifest's origin is trusted too.
    it('trusts the manifest’s own origin like any other', async function () {
      const { checkIdentity, fetchFromApp } = setup({
        trust: {
          trustedOrigins: ['https://podcast.example.com', 'https://app.example.net'],
          trustLoopback: false,
        },
      });

      const result = await checkIdentity(loaded(), null);

      assert.deepEqual(result, {
        trustedOrigins: ['https://podcast.example.com', 'https://app.example.net'],
      });
      assert.equal(fetchFromApp.mock.calls.length, 0);
    });

    it('trusts loopback origins only when told to', async function () {
      const local = loaded({
        manifestUrl: 'http://localhost:8787/ghost-app.json',
        surfaceUrl: 'http://127.0.0.1:8787/admin',
      });

      const trusting = setup({ trust: { trustedOrigins: [], trustLoopback: true } });
      assert.deepEqual(await trusting.checkIdentity(local, null), {
        trustedOrigins: ['http://localhost:8787', 'http://127.0.0.1:8787'],
      });
      assert.equal(trusting.fetchFromApp.mock.calls.length, 0);

      const challenging = setup();
      await challenging.checkIdentity(local, null);
      assert.equal(challenging.fetchFromApp.mock.calls.length, 2);
    });

    it('skips only the challenge: the pinned key still applies', async function () {
      const { checkIdentity } = setup({
        trust: {
          trustedOrigins: ['https://podcast.example.com', 'https://app.example.net'],
          trustLoopback: false,
        },
      });

      await assert.rejects(checkIdentity(loaded(), pinned({ identityKeyThumbprint: 'another' })), {
        code: 'APP_IDENTITY_MISMATCH',
      });
    });

    it.each([
      'https://app.example.net/ghost',
      'https://app.example.net?x=1',
      'https://user@app.example.net',
      'app.example.net',
      '*.example.net',
      'https://*.example.net',
      'null',
      42,
    ])(
      'fails every check on a trusted origin of %j, which isn’t an origin',
      async function (entry) {
        const { checkIdentity, fetchFromApp } = setup({
          trust: { trustedOrigins: [entry], trustLoopback: false },
        });

        await assert.rejects(checkIdentity(loaded(), null), {
          errorType: 'InternalServerError',
          code: 'APP_TRUSTED_ORIGINS_INVALID',
          context: JSON.stringify(entry),
        });
        assert.equal(fetchFromApp.mock.calls.length, 0);
      },
    );

    it('fails every check when trusted origins aren’t a list', async function () {
      const { checkIdentity } = setup({
        trust: { trustedOrigins: 'https://app.example.net', trustLoopback: false },
      });

      await assert.rejects(checkIdentity(loaded(), null), {
        code: 'APP_TRUSTED_ORIGINS_INVALID',
      });
    });
  });

  describe('for an app the site has', function () {
    it('passes a manifest signed with the pinned key, naming a current backend key', async function () {
      const { checkIdentity } = setup();

      await checkIdentity(loaded(), pinned({ retiredBackendKeys: new Set(['older']) }));
    });

    it('refuses a manifest signed with another identity key, saying nothing more', async function () {
      const { checkIdentity, fetchFromApp } = setup();

      await assert.rejects(
        checkIdentity(loaded(), pinned({ identityKeyThumbprint: 'another' })),
        (err: { code: string; context?: unknown; errorType: string }) => {
          assert.equal(err.errorType, 'ValidationError');
          assert.equal(err.code, 'APP_IDENTITY_MISMATCH');
          assert.equal(err.context, undefined);
          return true;
        },
      );
      assert.equal(fetchFromApp.mock.calls.length, 0);
    });

    it('refuses a manifest that names a retired backend key, before any challenge', async function () {
      const { checkIdentity, fetchFromApp } = setup();

      await assert.rejects(
        checkIdentity(loaded(), pinned({ retiredBackendKeys: new Set(['backend']) })),
        {
          errorType: 'ValidationError',
          code: 'APP_BACKEND_KEY_RETIRED',
          context: 'backend_key has been replaced, and can’t be used again',
        },
      );
      assert.equal(fetchFromApp.mock.calls.length, 0);
    });
  });
});
