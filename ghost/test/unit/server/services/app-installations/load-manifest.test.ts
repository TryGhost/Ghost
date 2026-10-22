import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { thumbprintOf } from '@tryghost/app-contracts/identity';
import { vi } from 'vitest';
import type {
  AppFetchFailure,
  AppFetchResult,
  FetchFromApp,
} from '../../../../../core/server/services/app-installations/fetch-from-app';
import {
  createManifestLoader,
  type ManifestRules,
} from '../../../../../core/server/services/app-installations/load-manifest';
import {
  generateTestAppKeys,
  generateTestKey,
  signTestManifest,
  type TestAppKeys,
} from '../../../../utils/app-identity';

const MANIFEST_URL = 'https://podcast.example.com/ghost-app.json';

const RULES: ManifestRules = {
  ghostUrls: ['https://site.example.com', 'https://site.example.com/ghost/'],
  allowLocalhost: false,
};

let keys: TestAppKeys;

beforeAll(async function () {
  keys = await generateTestAppKeys();
});

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'com.example.podcast',
    name: 'Podcast',
    description: 'Publish episodes and embed players.',
    author: { name: 'Example Audio', url: 'https://example.com' },
    accent_color: '#ff5500',
    icon: { name: 'audio-lines' },
    surfaces: [{ type: 'admin_page', url: 'https://podcast.example.com/admin' }],
    manifest_url: MANIFEST_URL,
    identity_key: keys.identity.publicJwk,
    backend_key: keys.backend.publicJwk,
    development: false,
    ...overrides,
  };
}

type Refusal = { code?: string; context?: string; errorDetails?: Array<{ path: string }> };

async function refusal(loading: Promise<unknown>): Promise<Refusal> {
  try {
    await loading;
  } catch (err) {
    return err as Refusal;
  }
  assert.fail('Expected the manifest to be refused');
}

/** What the app fetcher reports for the URL it is asked to read. */
type App = (url: string) => AppFetchResult | Promise<AppFetchResult>;

/** Serves `body` as it is, from the URL asked for or, as if redirects ended there, `finalUrl`. */
const servingText =
  (body: unknown, finalUrl?: string): App =>
  (url) => ({
    success: true,
    url: finalUrl ?? url,
    text: typeof body === 'string' ? body : JSON.stringify(body),
  });

/** Serves a manifest signed with the app's identity key, or with `identity`. */
const serving =
  (
    body: unknown,
    { finalUrl, identity }: { finalUrl?: string; identity?: TestAppKeys['identity'] } = {},
  ): App =>
  async (url) =>
    servingText(await signTestManifest(body, identity ?? keys.identity), finalUrl)(url);

const failing =
  (failure: AppFetchFailure): App =>
  () => ({ success: false, failure });

function setup({ app, rules = RULES }: { app?: App; rules?: ManifestRules } = {}) {
  app ??= serving(manifest());
  const fetchFromApp = vi.fn<FetchFromApp>(async (url) => app!(url));
  const warn = vi.fn();
  const loadManifest = createManifestLoader({
    fetchFromApp,
    logging: { warn },
    getManifestRules: () => rules,
  });
  return { loadManifest, fetchFromApp, warn };
}

describe('createManifestLoader', function () {
  describe('the manifest URL', function () {
    it('fetches and keeps the address as the URL parser reads it, not as it was given', async function () {
      const { loadManifest, fetchFromApp } = setup();

      const loaded = await loadManifest(' https://Podcast.Example.com/ghost-app.json\n');

      assert.equal(fetchFromApp.mock.calls[0][0], MANIFEST_URL);
      assert.equal(loaded.manifestUrl, MANIFEST_URL);
    });

    it('refuses an address it would not load, without fetching it', async function () {
      const { loadManifest, fetchFromApp } = setup();

      for (const manifestUrl of [
        'podcast.example.com/ghost-app.json',
        'http://podcast.example.com/ghost-app.json',
        Object.assign(new URL(MANIFEST_URL), { username: 'user', password: 'example' }).href,
        `https://podcast.example.com/${'a'.repeat(2000)}`,
        'http://localhost:8787/ghost-app.json',
        `${MANIFEST_URL}#v2`,
        `${MANIFEST_URL}#`,
      ]) {
        const err = await refusal(loadManifest(manifestUrl));
        assert.equal(err.code, 'APP_MANIFEST_URL_INVALID', manifestUrl);
      }
      assert.equal(fetchFromApp.mock.calls.length, 0);
    });
  });

  describe('fetching', function () {
    it('asks the app for JSON no larger than it can store', async function () {
      const { loadManifest, fetchFromApp } = setup();

      await loadManifest(MANIFEST_URL);

      assert.deepEqual(fetchFromApp.mock.calls, [
        [MANIFEST_URL, { maxBytes: 64 * 1024, headers: { accept: 'application/json' } }],
      ]);
    });

    it('loads a signed manifest, with the thumbprints of its keys', async function () {
      const { loadManifest } = setup();

      const loaded = await loadManifest(MANIFEST_URL);

      assert.equal(loaded.manifestUrl, MANIFEST_URL);
      assert.deepEqual(loaded.manifest.surfaces, [
        { type: 'admin_page', url: 'https://podcast.example.com/admin' },
      ]);
      assert.deepEqual(JSON.parse(loaded.serialised), loaded.manifest);
      assert.equal(loaded.identityKeyThumbprint, await thumbprintOf(keys.identity.publicJwk));
      assert.equal(loaded.backendKeyThumbprint, await thumbprintOf(keys.backend.publicJwk));
    });

    // Ghost compares the address it was asked for, which is the one it stores and fetches
    // again later.
    it('follows redirects on the same host, but checks the manifest names the address it started from', async function () {
      const { loadManifest } = setup({
        app: serving(manifest(), { finalUrl: 'https://podcast.example.com/v2/ghost-app.json' }),
      });

      const loaded = await loadManifest(MANIFEST_URL);

      assert.equal(loaded.manifestUrl, MANIFEST_URL);
    });

    it('accepts a signed manifest, or the manifest in it, that starts with a byte order mark', async function () {
      const bom = String.fromCharCode(0xfeff);
      const signed = await signTestManifest(manifest(), keys.identity);
      const signedText = await signTestManifest(bom + JSON.stringify(manifest()), keys.identity);

      for (const app of [servingText(bom + JSON.stringify(signed)), servingText(signedText)]) {
        const loaded = await setup({ app }).loadManifest(MANIFEST_URL);
        assert.equal(loaded.manifest.id, 'com.example.podcast');
      }
    });

    it('refuses a manifest that is not JSON', async function () {
      const { loadManifest } = setup({ app: serving('<html></html>') });

      await assert.rejects(loadManifest(MANIFEST_URL), {
        code: 'APP_MANIFEST_NOT_JSON',
        context: MANIFEST_URL,
      });
    });
  });

  describe('when the app can’t be read', function () {
    it('reports an app it can’t reach as unreachable, logging why without saying it', async function () {
      const cause = new Error('Connection failed at a private upstream address');
      const { loadManifest, warn } = setup({ app: failing({ reason: 'unreachable', cause }) });

      await assert.rejects(loadManifest(MANIFEST_URL), {
        errorType: 'ValidationError',
        code: 'APP_MANIFEST_UNREACHABLE',
        message: 'Could not load the app’s manifest.',
        context: MANIFEST_URL,
      });
      assert.deepEqual(warn.mock.calls, [
        [`Could not load the app manifest at ${MANIFEST_URL}`],
        [cause],
      ]);
    });

    it('reports an error status as unreachable, saying only the status', async function () {
      const cause = new Error('Response code 404 (Not Found)');
      const { loadManifest, warn } = setup({
        app: failing({ reason: 'unreachable', status: 404, cause }),
      });

      await assert.rejects(loadManifest(MANIFEST_URL), {
        code: 'APP_MANIFEST_UNREACHABLE',
        context: `${MANIFEST_URL} answered with HTTP 404`,
      });
      assert.deepEqual(warn.mock.calls, [
        [`Could not load the app manifest at ${MANIFEST_URL}`],
        [cause],
      ]);
    });

    it('reports a redirect to a Location that is not a URL as unreachable, with its status', async function () {
      const { loadManifest, warn } = setup({
        app: failing({ reason: 'location_not_url', status: 302 }),
      });
      const context = `${MANIFEST_URL} answered with HTTP 302 and a Location that is not a URL`;

      await assert.rejects(loadManifest(MANIFEST_URL), {
        code: 'APP_MANIFEST_UNREACHABLE',
        context,
      });
      // Logged like every other unreachable manifest, so an operator can tell why.
      assert.deepEqual(warn.mock.calls, [
        [`Could not load the app manifest at ${MANIFEST_URL}`],
        [context],
      ]);
    });

    it('reports a refused redirect as unreachable, with its status', async function () {
      const { loadManifest, warn } = setup({
        app: failing({ reason: 'redirect_refused', status: 302 }),
      });
      const context = `${MANIFEST_URL} answered with HTTP 302`;

      await assert.rejects(loadManifest(MANIFEST_URL), {
        code: 'APP_MANIFEST_UNREACHABLE',
        context,
      });
      assert.deepEqual(warn.mock.calls, [
        [`Could not load the app manifest at ${MANIFEST_URL}`],
        [context],
      ]);
    });

    it('refuses a manifest that redirects to another host', async function () {
      const { loadManifest } = setup({
        app: failing({ reason: 'redirected', host: 'elsewhere.example.net' }),
      });

      await assert.rejects(loadManifest(MANIFEST_URL), {
        code: 'APP_MANIFEST_REDIRECTED',
        message: 'The app’s manifest redirects to another host.',
        context: `${MANIFEST_URL} redirects to elsewhere.example.net`,
      });
    });

    it('refuses a manifest larger than it can store', async function () {
      const { loadManifest } = setup({ app: failing({ reason: 'too_large' }) });

      await assert.rejects(loadManifest(MANIFEST_URL), {
        code: 'APP_MANIFEST_TOO_LARGE',
        message: 'The app’s manifest is larger than 64 KB.',
        context: MANIFEST_URL,
      });
    });
  });

  describe('the signature', function () {
    it('refuses a manifest that is not signed, saying what was expected', async function () {
      const { loadManifest } = setup({ app: servingText(manifest()) });

      await assert.rejects(loadManifest(MANIFEST_URL), {
        errorType: 'ValidationError',
        code: 'APP_MANIFEST_UNSIGNED',
        context:
          'Expected a signed manifest: flattened JWS JSON with protected, payload and signature',
      });
    });

    it('refuses a signed manifest whose payload is not JSON', async function () {
      const { loadManifest } = setup({ app: serving('<html></html>') });

      await assert.rejects(loadManifest(MANIFEST_URL), { code: 'APP_MANIFEST_NOT_JSON' });
    });

    it('refuses a manifest signed with a key other than the one it names', async function () {
      const other = await generateTestKey();
      const { loadManifest } = setup({ app: serving(manifest(), { identity: other }) });

      await assert.rejects(loadManifest(MANIFEST_URL), {
        errorType: 'ValidationError',
        code: 'APP_MANIFEST_SIGNATURE_INVALID',
        context: 'The signature was not made with identity_key',
      });
    });

    // Copied bytes still verify, so the address they name is what gives a copy away.
    it('refuses a manifest that names another address, however well signed', async function () {
      const { loadManifest } = setup();

      await assert.rejects(loadManifest('https://copies.example.net/ghost-app.json'), {
        errorType: 'ValidationError',
        code: 'APP_MANIFEST_URL_MISMATCH',
        context:
          'manifest_url: Expected https://copies.example.net/ghost-app.json, the address the manifest was read from',
      });
    });

    it('lists what is wrong with a manifest before checking its signature', async function () {
      const other = await generateTestKey();
      const { loadManifest } = setup({ app: serving(manifest({ name: '' }), { identity: other }) });

      await assert.rejects(loadManifest(MANIFEST_URL), { code: 'APP_MANIFEST_INVALID' });
    });
  });

  describe('validating', function () {
    it('lists what is wrong with a manifest that is not valid', async function () {
      const { loadManifest } = setup({ app: serving(manifest({ id: 'Podcast', name: '' })) });

      const err = await refusal(loadManifest(MANIFEST_URL));
      assert.equal(err.code, 'APP_MANIFEST_INVALID');
      assert.match(err.context!, /^id: .+; name: /);
      assert.deepEqual(
        err.errorDetails!.map(({ path }) => path),
        ['id', 'name'],
      );
    });

    it('refuses an app served from the site itself', async function () {
      const { loadManifest } = setup({
        app: serving(
          manifest({
            surfaces: [{ type: 'admin_page', url: 'https://site.example.com/content/app.html' }],
          }),
        ),
      });

      const err = await refusal(loadManifest(MANIFEST_URL));
      assert.equal(err.code, 'APP_MANIFEST_INVALID');
      assert.deepEqual(
        err.errorDetails!.map(({ path }) => path),
        ['surfaces[0].url'],
      );
    });
  });

  describe('the digest', function () {
    it('covers the manifest, which names its own address', async function () {
      const { loadManifest } = setup();

      const loaded = await loadManifest(MANIFEST_URL);

      assert.equal(loaded.digest, createHash('sha256').update(loaded.serialised).digest('hex'));
      assert.equal(JSON.parse(loaded.serialised).manifest_url, MANIFEST_URL);
    });

    it('stays the same however the app spells the same manifest', async function () {
      const reordered = Object.fromEntries(Object.entries(manifest()).reverse());

      const first = await setup({ app: serving(JSON.stringify(manifest())) }).loadManifest(
        MANIFEST_URL,
      );
      const second = await setup({
        app: serving(JSON.stringify(reordered, null, 2)),
      }).loadManifest(MANIFEST_URL);

      assert.equal(second.serialised, first.serialised);
      assert.equal(second.digest, first.digest);
    });
  });
});
