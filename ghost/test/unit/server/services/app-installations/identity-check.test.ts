import assert from 'node:assert/strict';
import { vi } from 'vitest';
import type {
  AppFetchOptions,
  AppFetchResult,
  FetchFromApp,
} from '../../../../../core/server/services/app-installations/fetch-from-app';
import {
  createIdentityChecker,
  readTrustedOrigins,
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
import { createLoggingFake } from '../../../../utils/logging-utils';

const MANIFEST_URL = 'https://podcast.example.com/ghost-app.json';
const ORIGIN = 'https://podcast.example.com';
const NOW = 1_800_000_000;

let keys: TestAppKeys;
let other: TestKey;

beforeAll(async function () {
  keys = await generateTestAppKeys();
  other = await generateTestKey();
});

function loaded({
  manifestUrl = MANIFEST_URL,
  issuedAt = NOW,
  digest = 'digest',
}: { manifestUrl?: string; issuedAt?: number; digest?: string } = {}): LoadedManifest {
  const manifest = {
    id: 'com.example.podcast',
    name: 'Podcast',
    description: 'Publish episodes.',
    author: { name: 'Example Audio', url: 'https://example.com/' },
    accent_color: '#ff5500',
    icon: { name: 'audio-lines' },
    surfaces: [{ type: 'admin_page' as const, url: new URL('/admin', manifestUrl).href }],
    manifest_url: manifestUrl,
    identity_key: keys.identity.publicJwk,
    backend_key: keys.backend.publicJwk,
    development: false,
  };
  return {
    manifestUrl,
    manifest,
    serialised: JSON.stringify(manifest),
    digest,
    identityKeyThumbprint: 'identity',
    issuedAt,
  };
}

/** How an origin answers a challenge. */
type Backend = (body: string, url: string) => AppFetchResult | Promise<AppFetchResult>;

const answering =
  (key: TestKey = keys.backend): Backend =>
  async (body, url) => ({
    success: true,
    url,
    text: await answerTestChallenge(body, key, url),
  });

const answeringWith =
  (result: AppFetchResult): Backend =>
  () =>
    result;

function setup({
  backend = answering(),
  trust = { trustedOrigins: new Set(), trustLoopback: false },
}: { backend?: Backend; trust?: TrustConfig } = {}) {
  const fetchFromApp = vi.fn<FetchFromApp>(async (url, options: AppFetchOptions) =>
    backend(options.body!, url),
  );
  const logging = createLoggingFake();
  const checker = createIdentityChecker({
    fetchFromApp,
    logging,
    getTrustConfig: () => trust,
    getAllowLocalhost: () => trust.trustLoopback,
    now: () => NOW,
  });
  /** Challenges the manifest URL's origin, then checks the loaded manifest. */
  const checkIdentity = (manifest: LoadedManifest, pinned: PinnedIdentity | null) =>
    checker.check(manifest, pinned, checker.challenge(manifest.manifestUrl));
  return { checker, checkIdentity, fetchFromApp, warn: logging.warn };
}

const pinned = (overrides: Partial<PinnedIdentity> = {}): PinnedIdentity => ({
  identityKeyThumbprint: 'identity',
  signedAt: NOW - 60,
  signedDigest: 'older',
  ...overrides,
});

describe('createIdentityChecker', function () {
  describe('the challenge', function () {
    it('challenges the one origin an app has, the manifest URL’s', async function () {
      const { checkIdentity, fetchFromApp } = setup();

      assert.deepEqual(await checkIdentity(loaded(), null), { trustedOrigins: [] });
      assert.deepEqual(
        fetchFromApp.mock.calls.map(([url]) => url),
        ['https://podcast.example.com/.well-known/ghost-app/challenge'],
      );
    });

    // So it runs while the manifest loads.
    it('sends the challenge as soon as it starts, before there is a manifest', function () {
      const { checker, fetchFromApp } = setup();

      checker.challenge(MANIFEST_URL);

      assert.equal(fetchFromApp.mock.calls.length, 1);
    });

    it('sends nothing for a manifest URL Ghost wouldn’t fetch', async function () {
      const { checker, fetchFromApp } = setup();

      for (const url of [
        'not a url',
        'http://podcast.example.com/ghost-app.json',
        'http://localhost/a',
      ]) {
        assert.deepEqual(await checker.challenge(url).outcome, { kind: 'skipped' });
      }
      assert.equal(fetchFromApp.mock.calls.length, 0);
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
        origin: ORIGIN,
        nonce: JSON.parse(options.body!).nonce,
      });
      assert.notEqual(options.body, fetchFromApp.mock.calls[1][1].body);
    });

    // The manifest that names a new backend key is the one its answer is checked against.
    it('accepts an answer with a backend key the manifest has just rotated to', async function () {
      const rotated = await generateTestKey();
      const { checkIdentity } = setup({ backend: answering(rotated) });
      const manifest = loaded();
      manifest.manifest.backend_key = rotated.publicJwk;

      assert.deepEqual(await checkIdentity(manifest, pinned()), { trustedOrigins: [] });
    });

    it('fails when the origin answers with another key', async function () {
      const { checkIdentity } = setup({ backend: answering(other) });

      await assert.rejects(checkIdentity(loaded(), null), {
        errorType: 'ValidationError',
        code: 'APP_CHALLENGE_FAILED',
        context: `${ORIGIN}: The signature was not made with backend_key`,
      });
    });

    it('fails when the origin answers with something other than a signature', async function () {
      const { checkIdentity } = setup({
        backend: answeringWith({ success: true, url: MANIFEST_URL, text: '<html></html>' }),
      });

      await assert.rejects(checkIdentity(loaded(), null), {
        code: 'APP_CHALLENGE_FAILED',
        context: `${ORIGIN}: Expected an answer of {"signature": "<compact JWS>"}`,
      });
    });

    it('fails when an answer is too large', async function () {
      const { checkIdentity } = setup({
        backend: answeringWith({ success: false, failure: { reason: 'too_large' } }),
      });

      await assert.rejects(checkIdentity(loaded(), null), {
        code: 'APP_CHALLENGE_FAILED',
        context: `${ORIGIN}: The answer is larger than 4 KB`,
      });
    });

    it('reports an origin that doesn’t answer as unreachable, logging why without saying it', async function () {
      const cause = new Error('Connection failed at a private upstream address');
      const { checkIdentity, warn } = setup({
        backend: answeringWith({ success: false, failure: { reason: 'unreachable', cause } }),
      });

      await assert.rejects(checkIdentity(loaded(), null), {
        errorType: 'ValidationError',
        code: 'APP_CHALLENGE_UNREACHABLE',
        context: ORIGIN,
      });
      assert.deepEqual(warn.args, [[`Could not challenge the app at ${ORIGIN}`], [cause]]);
    });

    it('reports an error status, or a redirect, as unreachable with the status', async function () {
      const failures = [
        { reason: 'unreachable', status: 404, cause: 'HTTP' },
        { reason: 'redirect_refused', status: 302 },
      ] as const;
      for (const failure of failures) {
        const { checkIdentity } = setup({ backend: answeringWith({ success: false, failure }) });

        await assert.rejects(checkIdentity(loaded(), null), {
          code: 'APP_CHALLENGE_UNREACHABLE',
          context: `${ORIGIN} answered the challenge with HTTP ${failure.status}`,
        });
      }
    });

    it('never rejects a started challenge, so a manifest that fails to load leaves nothing unhandled', async function () {
      const { checker } = setup({
        backend: () => {
          throw new Error('Unexpected');
        },
      });

      assert.equal((await checker.challenge(MANIFEST_URL).outcome).kind, 'failed');
    });

    it('challenges again when a challenge started for another manifest URL', async function () {
      const { checker, fetchFromApp } = setup();
      const elsewhere = 'https://audio.example.org/ghost-app.json';

      await checker.check(
        loaded({ manifestUrl: elsewhere }),
        null,
        checker.challenge(MANIFEST_URL),
      );

      assert.deepEqual(
        fetchFromApp.mock.calls.map(([url]) => url),
        [
          'https://podcast.example.com/.well-known/ghost-app/challenge',
          'https://audio.example.org/.well-known/ghost-app/challenge',
        ],
      );
    });
  });

  describe('trusted origins', function () {
    it('skips the challenge for an origin the site trusts, and reports it', async function () {
      const { checkIdentity, fetchFromApp } = setup({
        trust: { trustedOrigins: new Set([ORIGIN]), trustLoopback: false },
      });

      assert.deepEqual(await checkIdentity(loaded(), null), { trustedOrigins: [ORIGIN] });
      assert.equal(fetchFromApp.mock.calls.length, 0);
    });

    it('trusts loopback origins only when told to', async function () {
      const local = loaded({ manifestUrl: 'http://localhost:8787/ghost-app.json' });

      const trusting = setup({ trust: { trustedOrigins: new Set(), trustLoopback: true } });
      assert.deepEqual(await trusting.checkIdentity(local, null), {
        trustedOrigins: ['http://localhost:8787'],
      });
      assert.equal(trusting.fetchFromApp.mock.calls.length, 0);
    });

    it('skips only the challenge: the pinned key and signing time still apply', async function () {
      const { checkIdentity } = setup({
        trust: { trustedOrigins: new Set([ORIGIN]), trustLoopback: false },
      });

      await assert.rejects(checkIdentity(loaded(), pinned({ identityKeyThumbprint: 'another' })), {
        code: 'APP_IDENTITY_MISMATCH',
      });
      await assert.rejects(checkIdentity(loaded(), pinned({ signedAt: NOW + 1 })), {
        code: 'APP_MANIFEST_OUTDATED',
      });
    });
  });

  describe('when the manifest was signed', function () {
    it('accepts a manifest signed a few minutes ahead of Ghost’s clock', async function () {
      const { checkIdentity } = setup();

      await checkIdentity(loaded({ issuedAt: NOW + 5 * 60 }), null);
    });

    // Otherwise one manifest would hold every site to its time.
    it('refuses one signed further ahead, for an app the site has or not', async function () {
      const { checkIdentity } = setup();

      for (const pin of [null, pinned()]) {
        await assert.rejects(checkIdentity(loaded({ issuedAt: NOW + 5 * 60 + 1 }), pin), {
          errorType: 'ValidationError',
          code: 'APP_MANIFEST_SIGNED_IN_FUTURE',
        });
      }
    });

    it('accepts a manifest signed after the newest the site has seen, or that same one again', async function () {
      const { checkIdentity } = setup();

      await checkIdentity(loaded(), pinned());
      await checkIdentity(loaded({ digest: 'older', issuedAt: NOW - 60 }), pinned());
    });

    // A replaced backend key would come back with it.
    it('refuses a manifest signed before the newest the site has seen', async function () {
      const { checkIdentity, fetchFromApp } = setup();

      await assert.rejects(checkIdentity(loaded({ issuedAt: NOW - 61 }), pinned()), {
        errorType: 'ValidationError',
        code: 'APP_MANIFEST_OUTDATED',
      });
      // Refused before the answer is read; the challenge went out with the fetch.
      assert.equal(fetchFromApp.mock.calls.length, 1);
    });

    it('refuses another manifest signed at the same second as the newest', async function () {
      const { checkIdentity } = setup();

      await assert.rejects(checkIdentity(loaded({ issuedAt: NOW - 60 }), pinned()), {
        code: 'APP_MANIFEST_CONFLICT',
      });
    });
  });

  describe('for an app the site has', function () {
    it('refuses a manifest signed with another identity key, saying nothing more', async function () {
      const { checkIdentity } = setup();

      await assert.rejects(
        checkIdentity(loaded(), pinned({ identityKeyThumbprint: 'another' })),
        (err: { code: string; context?: unknown; errorType: string }) => {
          assert.equal(err.errorType, 'ValidationError');
          assert.equal(err.code, 'APP_IDENTITY_MISMATCH');
          assert.equal(err.context, undefined);
          return true;
        },
      );
    });
  });
});

describe('readTrustedOrigins', function () {
  it('reads each entry as the URL parser reads its origin', function () {
    assert.deepEqual(readTrustedOrigins(['https://APP.example.net/', 'http://localhost:8787']), {
      success: true,
      origins: new Set(['https://app.example.net', 'http://localhost:8787']),
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
  ])('names the entry %j, which isn’t an origin', function (entry) {
    assert.deepEqual(readTrustedOrigins([entry]), { success: false, entry });
  });

  it('names the whole value when it isn’t a list', function () {
    assert.deepEqual(readTrustedOrigins('https://app.example.net'), {
      success: false,
      entry: 'https://app.example.net',
    });
  });
});
