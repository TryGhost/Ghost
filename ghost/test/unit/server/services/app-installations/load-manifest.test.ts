import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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

const MANIFEST_URL = 'https://podcast.example.com/ghost-app.json';

const RULES: ManifestRules = {
  ghostUrls: ['https://site.example.com', 'https://site.example.com/ghost/'],
  allowLocalhost: false,
};

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'com.example.podcast',
    name: 'Podcast',
    description: 'Publish episodes and embed players.',
    author: { name: 'Example Audio', url: 'https://example.com' },
    accent_color: '#ff5500',
    icon: { name: 'audio-lines' },
    surfaces: [{ type: 'admin_page', url: 'admin' }],
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
type App = (url: string) => AppFetchResult;

/** Serves `body` from the URL asked for or, as if redirects ended there, from `finalUrl`. */
const serving =
  (body: unknown, finalUrl?: string): App =>
  (url) => ({
    success: true,
    url: finalUrl ?? url,
    text: typeof body === 'string' ? body : JSON.stringify(body),
  });

const failing =
  (failure: AppFetchFailure): App =>
  () => ({ success: false, failure });

function setup({
  app = serving(manifest()),
  rules = RULES,
}: { app?: App; rules?: ManifestRules } = {}) {
  const fetchFromApp = vi.fn<FetchFromApp>(async (url) => app(url));
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

    it('fetches and keeps the address without its fragment, which no fetch ever sends', async function () {
      const { loadManifest, fetchFromApp } = setup();

      const loaded = await loadManifest(`${MANIFEST_URL}#v2`);

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
        [MANIFEST_URL, { accept: 'application/json', maxBytes: 64 * 1024 }],
      ]);
    });

    it('loads a manifest, with its URLs resolved against where it was read from', async function () {
      const { loadManifest } = setup();

      const loaded = await loadManifest(MANIFEST_URL);

      assert.equal(loaded.manifestUrl, MANIFEST_URL);
      assert.deepEqual(loaded.manifest.surfaces, [
        { type: 'admin_page', url: 'https://podcast.example.com/admin' },
      ]);
      assert.deepEqual(JSON.parse(loaded.serialised), loaded.manifest);
    });

    it('resolves URLs from where redirects end, but keeps the address it started from', async function () {
      const { loadManifest } = setup({
        app: serving(manifest(), 'https://podcast.example.com/v2/ghost-app.json'),
      });

      const loaded = await loadManifest(MANIFEST_URL);

      assert.equal(loaded.manifestUrl, MANIFEST_URL);
      assert.equal(loaded.manifest.surfaces[0].url, 'https://podcast.example.com/v2/admin');
    });

    it('does not count the fragment of where redirects end against its length', async function () {
      const { loadManifest } = setup({
        app: serving(
          manifest(),
          `https://podcast.example.com/v2/ghost-app.json#${'a'.repeat(2000)}`,
        ),
      });

      const loaded = await loadManifest(MANIFEST_URL);

      assert.equal(loaded.manifestUrl, MANIFEST_URL);
      assert.equal(loaded.manifest.surfaces[0].url, 'https://podcast.example.com/v2/admin');
    });

    it('accepts a manifest that starts with a byte order mark', async function () {
      const { loadManifest } = setup({
        app: serving(String.fromCharCode(0xfeff) + JSON.stringify(manifest())),
      });

      const loaded = await loadManifest(MANIFEST_URL);

      assert.equal(loaded.manifest.id, 'com.example.podcast');
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
    // Every URL absolute, so any address serves the very same manifest.
    const absolute = manifest({
      icon: { url: 'https://cdn.example.net/icon.svg' },
      surfaces: [{ type: 'admin_page', url: 'https://app.example.net/ghost' }],
    });

    it('covers the manifest together with the address it is read from', async function () {
      const { loadManifest } = setup({ app: serving(absolute) });

      const loaded = await loadManifest(MANIFEST_URL);

      assert.equal(
        loaded.digest,
        createHash('sha256').update(`${loaded.manifestUrl}\n${loaded.serialised}`).digest('hex'),
      );
      // So the newline between them cannot be mistaken for part of either.
      assert.ok(!loaded.manifestUrl.includes('\n'));
      assert.ok(!loaded.serialised.includes('\n'));
    });

    it('differs for two addresses that serve the same manifest', async function () {
      const { loadManifest } = setup({ app: serving(absolute) });

      const here = await loadManifest(MANIFEST_URL);
      const elsewhere = await loadManifest('https://audio.example.org/ghost-app.json');

      assert.equal(here.serialised, elsewhere.serialised);
      assert.notEqual(here.digest, elsewhere.digest);
    });

    it('stays the same however the app spells the same manifest', async function () {
      const reordered = Object.fromEntries(Object.entries(absolute).reverse());

      const first = await setup({ app: serving(JSON.stringify(absolute)) }).loadManifest(
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
