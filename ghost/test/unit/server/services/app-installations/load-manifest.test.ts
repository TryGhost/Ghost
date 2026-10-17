import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import got from 'got';
import nock from 'nock';
import sinon from 'sinon';
import { createAppFetcher } from '../../../../../core/server/services/app-installations/fetch-from-app';
import {
  createManifestLoader,
  type ManifestRules,
} from '../../../../../core/server/services/app-installations/load-manifest';

const MANIFEST_URL = 'https://podcast.example.com/ghost-app.json';

const RULES: ManifestRules = {
  ghostUrls: ['https://site.example.com', 'https://site.example.com/ghost/'],
  allowLocalhost: false,
};

const DEV_RULES: ManifestRules = { ghostUrls: ['http://localhost:2368'], allowLocalhost: true };

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

describe('createManifestLoader', function () {
  beforeAll(function () {
    nock.disableNetConnect();
  });

  afterEach(function () {
    nock.cleanAll();
  });

  afterAll(function () {
    nock.enableNetConnect();
  });

  const loader = ({
    alias = null,
    rules = RULES,
    logging = { warn: sinon.stub() },
  }: {
    alias?: string | null;
    rules?: ManifestRules;
    logging?: { warn(value: unknown): void };
  } = {}) =>
    createManifestLoader({
      fetchFromApp: createAppFetcher({ request: got, getLocalhostAlias: () => alias }),
      logging,
      getManifestRules: () => rules,
    });

  describe('the manifest URL', function () {
    it('keeps the address as the URL parser reads it, not as it was given', async function () {
      nock('https://podcast.example.com').get('/ghost-app.json').reply(200, manifest());

      const loaded = await loader()(' https://Podcast.Example.com/ghost-app.json\n');

      assert.equal(loaded.manifestUrl, MANIFEST_URL);
    });

    it('keeps the address without its fragment, which no fetch ever sends', async function () {
      nock('https://podcast.example.com').get('/ghost-app.json').reply(200, manifest());

      const loaded = await loader()(`${MANIFEST_URL}#v2`);

      assert.equal(loaded.manifestUrl, MANIFEST_URL);
    });

    it('refuses an address it would not load, before any request', async function () {
      for (const manifestUrl of [
        'podcast.example.com/ghost-app.json',
        'http://podcast.example.com/ghost-app.json',
        Object.assign(new URL(MANIFEST_URL), { username: 'user', password: 'example' }).href,
        `https://podcast.example.com/${'a'.repeat(2000)}`,
        'http://localhost:8787/ghost-app.json',
      ]) {
        // Nothing is served for these, so a fetch would fail as unreachable instead.
        const err = await refusal(loader()(manifestUrl));
        assert.equal(err.code, 'APP_MANIFEST_URL_INVALID', manifestUrl);
      }
    });
  });

  describe('fetching', function () {
    it('loads a manifest, with its URLs resolved against where it was read from', async function () {
      nock('https://podcast.example.com').get('/ghost-app.json').reply(200, manifest());

      const loaded = await loader()(MANIFEST_URL);

      assert.equal(loaded.manifestUrl, MANIFEST_URL);
      assert.deepEqual(loaded.manifest.surfaces, [
        { type: 'admin_page', url: 'https://podcast.example.com/admin' },
      ]);
      assert.deepEqual(JSON.parse(loaded.serialised), loaded.manifest);
    });

    it('resolves URLs from where a redirect ends, but keeps the address it started from', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(302, '', { location: '/v2/ghost-app.json' })
        .get('/v2/ghost-app.json')
        .reply(200, manifest());

      const loaded = await loader()(MANIFEST_URL);

      assert.equal(loaded.manifestUrl, MANIFEST_URL);
      assert.equal(loaded.manifest.surfaces[0].url, 'https://podcast.example.com/v2/admin');
    });

    it('follows a redirect that carries credentials, and resolves URLs from there without them', async function () {
      const location = Object.assign(new URL('https://podcast.example.com/v2/ghost-app.json'), {
        username: 'user',
        password: 'example',
      }).href;
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(302, '', { location })
        .get('/v2/ghost-app.json')
        .reply(200, manifest({ icon: { url: 'icon.svg' } }));

      const loaded = await loader()(MANIFEST_URL);

      assert.equal(loaded.manifestUrl, MANIFEST_URL);
      assert.equal(loaded.manifest.surfaces[0].url, 'https://podcast.example.com/v2/admin');
      assert.deepEqual(loaded.manifest.icon, { url: 'https://podcast.example.com/v2/icon.svg' });
    });

    it('does not count a fragment in a redirect against the length of where it ends', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(302, '', { location: `/v2/ghost-app.json#${'a'.repeat(2000)}` })
        .get('/v2/ghost-app.json')
        .reply(200, manifest());

      const loaded = await loader()(MANIFEST_URL);

      assert.equal(loaded.manifestUrl, MANIFEST_URL);
      assert.equal(loaded.manifest.surfaces[0].url, 'https://podcast.example.com/v2/admin');
    });

    it('reads a localhost manifest through the alias, keeping its own address', async function () {
      nock('http://host.docker.internal:8787', { reqheaders: { host: 'localhost:8787' } })
        .get('/ghost-app.json')
        .reply(200, manifest());

      const loaded = await loader({ alias: 'host.docker.internal', rules: DEV_RULES })(
        'http://localhost:8787/ghost-app.json',
      );

      assert.equal(loaded.manifestUrl, 'http://localhost:8787/ghost-app.json');
      assert.equal(loaded.manifest.surfaces[0].url, 'http://localhost:8787/admin');
    });

    it('treats any localhost name the manifest rules accept as localhost', async function () {
      nock('http://host.docker.internal:8787', { reqheaders: { host: 'podcast.localhost:8787' } })
        .get('/ghost-app.json')
        .reply(200, manifest());

      const loaded = await loader({ alias: 'host.docker.internal', rules: DEV_RULES })(
        'http://podcast.localhost:8787/ghost-app.json',
      );

      assert.equal(loaded.manifest.surfaces[0].url, 'http://podcast.localhost:8787/admin');
    });

    it('follows a redirect on localhost through the alias too, with the original host', async function () {
      nock('http://host.docker.internal:8787', { reqheaders: { host: 'localhost:8787' } })
        .get('/ghost-app.json')
        .reply(302, '', { location: 'http://localhost:8787/v2/ghost-app.json' })
        .get('/v2/ghost-app.json')
        .reply(200, manifest());

      const loaded = await loader({ alias: 'host.docker.internal', rules: DEV_RULES })(
        'http://localhost:8787/ghost-app.json',
      );

      assert.equal(loaded.manifestUrl, 'http://localhost:8787/ghost-app.json');
      assert.equal(loaded.manifest.surfaces[0].url, 'http://localhost:8787/v2/admin');
    });

    // A relative redirect resolves against the aliased address Ghost actually requested, so
    // it lands on the alias host and must be read as the localhost it stands for.
    it('follows a relative redirect through the alias as a redirect on localhost', async function () {
      nock('http://host.docker.internal:8787', { reqheaders: { host: 'localhost:8787' } })
        .get('/ghost-app.json')
        .reply(302, '', { location: '/v2/ghost-app.json' })
        .get('/v2/ghost-app.json')
        .reply(200, manifest());

      const loaded = await loader({ alias: 'host.docker.internal', rules: DEV_RULES })(
        'http://localhost:8787/ghost-app.json',
      );

      assert.equal(loaded.manifest.surfaces[0].url, 'http://localhost:8787/v2/admin');
    });

    it('leaves addresses other than localhost alone', async function () {
      nock('https://podcast.example.com').get('/ghost-app.json').reply(200, manifest());

      const loaded = await loader({ alias: 'host.docker.internal' })(MANIFEST_URL);

      assert.equal(loaded.manifest.surfaces[0].url, 'https://podcast.example.com/admin');
    });

    it('allows a redirect from HTTP to HTTPS on the same host', async function () {
      nock('http://podcast.localhost')
        .get('/ghost-app.json')
        .reply(301, '', { location: 'https://podcast.localhost/ghost-app.json' });
      nock('https://podcast.localhost').get('/ghost-app.json').reply(200, manifest());

      const loaded = await loader({ rules: DEV_RULES })('http://podcast.localhost/ghost-app.json');

      assert.equal(loaded.manifestUrl, 'http://podcast.localhost/ghost-app.json');
      assert.equal(loaded.manifest.surfaces[0].url, 'https://podcast.localhost/admin');
    });

    it('judges each redirect against the one before it, not the first address', async function () {
      nock('http://podcast.localhost')
        .get('/ghost-app.json')
        .reply(301, '', { location: 'https://podcast.localhost/ghost-app.json' });
      nock('https://podcast.localhost')
        .get('/ghost-app.json')
        .reply(302, '', { location: 'http://podcast.localhost/v2/ghost-app.json' });

      const err = await refusal(
        loader({ rules: DEV_RULES })('http://podcast.localhost/ghost-app.json'),
      );
      assert.equal(err.code, 'APP_MANIFEST_REDIRECTED');
    });

    it('refuses a redirect to another host', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(302, '', { location: 'https://elsewhere.example.net/ghost-app.json' });

      const err = await refusal(loader()(MANIFEST_URL));
      assert.equal(err.code, 'APP_MANIFEST_REDIRECTED');
      assert.equal(err.context, `${MANIFEST_URL} redirects to elsewhere.example.net`);
    });

    // Whichever statuses got follows, a Location to another host is never followed.
    it.each([300, 301, 302, 303, 304, 305, 306, 307, 308, 399])(
      'never follows a Location to another host on HTTP %i',
      async function (status) {
        nock('https://podcast.example.com')
          .get('/ghost-app.json')
          .reply(status, '', { location: 'https://elsewhere.example.net/ghost-app.json' });
        const elsewhere = nock('https://elsewhere.example.net')
          .get('/ghost-app.json')
          .reply(200, manifest());

        const err = await refusal(loader()(MANIFEST_URL));
        assert.equal(err.code, 'APP_MANIFEST_REDIRECTED');
        assert.equal(elsewhere.isDone(), false);
      },
    );

    it('reports a redirect to a Location that is not a URL as unreachable, with its status', async function () {
      const warn = sinon.stub();
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(302, '', { location: 'http://[bad' });

      const err = await refusal(loader({ logging: { warn } })(MANIFEST_URL));
      assert.equal(err.code, 'APP_MANIFEST_UNREACHABLE');
      assert.equal(
        err.context,
        `${MANIFEST_URL} answered with HTTP 302 and a Location that is not a URL`,
      );
      // Logged like every other unreachable manifest, so an operator can tell why.
      sinon.assert.calledWith(warn, `Could not load the app manifest at ${MANIFEST_URL}`);
      sinon.assert.calledWith(warn, err.context);
    });

    it('follows three redirects', async function () {
      const scope = nock('https://podcast.example.com');
      for (const hop of [1, 2, 3]) {
        scope
          .get(hop === 1 ? '/ghost-app.json' : `/${hop - 1}.json`)
          .reply(302, '', { location: `/${hop}.json` });
      }
      scope.get('/3.json').reply(200, manifest());

      const loaded = await loader()(MANIFEST_URL);

      assert.equal(loaded.manifestUrl, MANIFEST_URL);
      assert.equal(scope.isDone(), true);
    });

    it('follows at most three redirects', async function () {
      const scope = nock('https://podcast.example.com');
      for (const hop of [1, 2, 3, 4]) {
        scope
          .get(hop === 1 ? '/ghost-app.json' : `/${hop - 1}.json`)
          .reply(302, '', { location: `/${hop}.json` });
      }
      const end = nock('https://podcast.example.com').get('/4.json').reply(200, manifest());

      const err = await refusal(loader()(MANIFEST_URL));
      assert.equal(err.code, 'APP_MANIFEST_UNREACHABLE');
      assert.equal(end.isDone(), false);
    });

    it('refuses a redirect to another port on the same host', async function () {
      nock('http://localhost:8787')
        .get('/ghost-app.json')
        .reply(302, '', { location: 'http://localhost:9999/ghost-app.json' });

      const err = await refusal(
        loader({ rules: DEV_RULES })('http://localhost:8787/ghost-app.json'),
      );
      assert.equal(err.code, 'APP_MANIFEST_REDIRECTED');
    });

    it('follows a redirect to a path with characters outside ASCII, and resolves URLs from there', async function () {
      // On the wire the location is UTF-8 bytes, which Node hands over as latin1.
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(302, '', {
          location: Buffer.from('/épisodes/ghost-app.json', 'utf8').toString('latin1'),
        })
        .get('/%C3%A9pisodes/ghost-app.json')
        .reply(200, manifest());

      const loaded = await loader()(MANIFEST_URL);

      assert.equal(
        loaded.manifest.surfaces[0].url,
        'https://podcast.example.com/%C3%A9pisodes/admin',
      );
    });

    // got asks whether to follow on every response, so a Location header on one it does not
    // follow must not be read as a redirect.
    it('resolves URLs from where it was read when a manifest carries a Location header', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(200, manifest(), { location: '/v2/ghost-app.json' });

      const loaded = await loader()(MANIFEST_URL);

      assert.equal(loaded.manifest.surfaces[0].url, 'https://podcast.example.com/admin');
    });

    it('does not refuse a manifest that carries a Location header on another host', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(200, manifest(), { location: 'https://elsewhere.example.net/ghost-app.json' });

      const loaded = await loader()(MANIFEST_URL);

      assert.equal(loaded.manifest.surfaces[0].url, 'https://podcast.example.com/admin');
    });

    it('reports an error page with a Location header on another host as unreachable', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(404, '', { location: 'https://elsewhere.example.net/ghost-app.json' });

      const err = await refusal(loader()(MANIFEST_URL));
      assert.equal(err.code, 'APP_MANIFEST_UNREACHABLE');
      assert.equal(err.context, `${MANIFEST_URL} answered with HTTP 404`);
    });

    it('resolves URLs from where a redirect through the alias ends, whatever Location the manifest carries', async function () {
      nock('http://host.docker.internal:8787', { reqheaders: { host: 'localhost:8787' } })
        .get('/ghost-app.json')
        .reply(302, '', { location: '/v2/ghost-app.json' })
        .get('/v2/ghost-app.json')
        .reply(200, manifest(), { location: '/v3/ghost-app.json' });

      const loaded = await loader({ alias: 'host.docker.internal', rules: DEV_RULES })(
        'http://localhost:8787/ghost-app.json',
      );

      assert.equal(loaded.manifestUrl, 'http://localhost:8787/ghost-app.json');
      assert.equal(loaded.manifest.surfaces[0].url, 'http://localhost:8787/v2/admin');
    });

    it('logs transport details through the supplied logger without exposing them to the caller', async function () {
      const warn = sinon.stub();
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .replyWithError('Connection failed at a private upstream address');

      await assert.rejects(loader({ logging: { warn } })(MANIFEST_URL), {
        errorType: 'ValidationError',
        code: 'APP_MANIFEST_UNREACHABLE',
        message: 'Could not load the app’s manifest.',
        context: MANIFEST_URL,
      });

      sinon.assert.calledTwice(warn);
      sinon.assert.calledWithExactly(
        warn.firstCall,
        `Could not load the app manifest at ${MANIFEST_URL}`,
      );
      const failure = warn.secondCall.args[0];
      assert.ok(failure instanceof Error);
      assert.equal(failure.message, 'Connection failed at a private upstream address');
    });

    it('reports a large error page as unreachable, with its status', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(404, 'x'.repeat(100 * 1024));

      const err = await refusal(loader()(MANIFEST_URL));
      assert.equal(err.code, 'APP_MANIFEST_UNREACHABLE');
      assert.equal(err.context, `${MANIFEST_URL} answered with HTTP 404`);
    });

    it('refuses a manifest larger than it can store', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(200, JSON.stringify({ ...manifest(), pad: 'x'.repeat(100 * 1024) }));

      const err = await refusal(loader()(MANIFEST_URL));
      assert.equal(err.code, 'APP_MANIFEST_TOO_LARGE');
    });

    it('accepts a manifest that starts with a byte order mark', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(200, String.fromCharCode(0xfeff) + JSON.stringify(manifest()));

      const loaded = await loader()(MANIFEST_URL);

      assert.equal(loaded.manifest.id, 'com.example.podcast');
    });

    it('refuses a manifest that is not JSON', async function () {
      nock('https://podcast.example.com').get('/ghost-app.json').reply(200, '<html></html>');

      const err = await refusal(loader()(MANIFEST_URL));
      assert.equal(err.code, 'APP_MANIFEST_NOT_JSON');
    });
  });

  describe('validating', function () {
    it('lists what is wrong with a manifest that is not valid', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(200, manifest({ id: 'Podcast', name: '' }));

      const err = await refusal(loader()(MANIFEST_URL));
      assert.equal(err.code, 'APP_MANIFEST_INVALID');
      assert.match(err.context!, /^id: .+; name: /);
      assert.deepEqual(
        err.errorDetails!.map(({ path }) => path),
        ['id', 'name'],
      );
    });

    it('refuses an app served from the site itself', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(
          200,
          manifest({
            surfaces: [{ type: 'admin_page', url: 'https://site.example.com/content/app.html' }],
          }),
        );

      const err = await refusal(loader()(MANIFEST_URL));
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
      nock('https://podcast.example.com').get('/ghost-app.json').reply(200, absolute);

      const loaded = await loader()(MANIFEST_URL);

      assert.equal(
        loaded.digest,
        createHash('sha256').update(`${loaded.manifestUrl}\n${loaded.serialised}`).digest('hex'),
      );
      // So the newline between them cannot be mistaken for part of either.
      assert.ok(!loaded.manifestUrl.includes('\n'));
      assert.ok(!loaded.serialised.includes('\n'));
    });

    it('differs for two addresses that serve the same manifest', async function () {
      nock('https://podcast.example.com').get('/ghost-app.json').reply(200, absolute);
      nock('https://audio.example.org').get('/ghost-app.json').reply(200, absolute);

      const here = await loader()(MANIFEST_URL);
      const elsewhere = await loader()('https://audio.example.org/ghost-app.json');

      assert.equal(here.serialised, elsewhere.serialised);
      assert.notEqual(here.digest, elsewhere.digest);
    });

    it('stays the same however the app spells the same manifest', async function () {
      const reordered = Object.fromEntries(Object.entries(absolute).reverse());
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(200, JSON.stringify(absolute))
        .get('/ghost-app.json')
        .reply(200, JSON.stringify(reordered, null, 2));

      const first = await loader()(MANIFEST_URL);
      const second = await loader()(MANIFEST_URL);

      assert.equal(second.serialised, first.serialised);
      assert.equal(second.digest, first.digest);
    });
  });
});
