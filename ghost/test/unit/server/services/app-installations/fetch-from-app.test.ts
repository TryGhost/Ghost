import assert from 'node:assert/strict';
import got, { type Got } from 'got';
import nock from 'nock';
import { vi } from 'vitest';
import {
  createAppFetcher,
  type AppFetchResult,
} from '../../../../../core/server/services/app-installations/fetch-from-app';

const APP_URL = 'https://podcast.example.com/ghost-app.json';
const OPTIONS = { accept: 'text/plain', maxBytes: 1024 };

function read(result: AppFetchResult) {
  if (!result.success) {
    assert.fail(`Expected the URL to be read, not ${JSON.stringify(result.failure)}`);
  }
  return result;
}

function unreachable(result: AppFetchResult) {
  if (result.success || result.failure.reason !== 'unreachable') {
    assert.fail(`Expected the URL to be unreachable, not ${JSON.stringify(result)}`);
  }
  return result.failure;
}

describe('createAppFetcher', function () {
  beforeAll(function () {
    nock.disableNetConnect();
  });

  afterEach(function () {
    nock.cleanAll();
  });

  afterAll(function () {
    nock.enableNetConnect();
  });

  const fetcher = ({ alias = null }: { alias?: string | null } = {}) =>
    createAppFetcher({ request: got, getLocalhostAlias: () => alias });

  describe('reading', function () {
    it('reads the text a URL serves, asking for the given type', async function () {
      nock('https://podcast.example.com', { reqheaders: { accept: 'text/plain' } })
        .get('/ghost-app.json')
        .reply(200, 'Hello');

      const result = await fetcher()(APP_URL, OPTIONS);

      assert.deepEqual(result, { success: true, url: APP_URL, text: 'Hello' });
    });

    it('reports a URL it can’t read as unreachable, without a request', async function () {
      const request = vi.fn();
      const fetchFromApp = createAppFetcher({
        request: request as unknown as Got,
        getLocalhostAlias: () => null,
      });

      const failure = unreachable(await fetchFromApp('not a url', OPTIONS));

      assert.equal(failure.status, undefined);
      assert.equal(failure.cause, 'not a url is not a URL');
      assert.equal(request.mock.calls.length, 0);
    });

    it('reports an error status as unreachable, with the status', async function () {
      nock('https://podcast.example.com').get('/ghost-app.json').reply(404, 'Not found');

      const failure = unreachable(await fetcher()(APP_URL, OPTIONS));

      assert.equal(failure.status, 404);
    });

    it('reports a request that gets no answer as unreachable, with why for the logs', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .replyWithError('Connection failed at a private upstream address');

      const failure = unreachable(await fetcher()(APP_URL, OPTIONS));

      assert.equal(failure.status, undefined);
      assert.ok(failure.cause instanceof Error);
      assert.equal(failure.cause.message, 'Connection failed at a private upstream address');
    });
  });

  describe('the size limit', function () {
    it('reads a response of exactly the limit', async function () {
      nock('https://podcast.example.com').get('/ghost-app.json').reply(200, 'x'.repeat(1024));

      const result = await fetcher()(APP_URL, OPTIONS);

      assert.equal(result.success, true);
    });

    it('refuses a successful response larger than the limit', async function () {
      nock('https://podcast.example.com').get('/ghost-app.json').reply(200, 'x'.repeat(1025));

      const result = await fetcher()(APP_URL, OPTIONS);

      assert.deepEqual(result, { success: false, failure: { reason: 'too_large' } });
    });

    it('reports a large error page as unreachable, with its status', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(404, 'x'.repeat(100 * 1024));

      const failure = unreachable(await fetcher()(APP_URL, OPTIONS));

      assert.equal(failure.status, 404);
    });
  });

  describe('redirects', function () {
    it('follows a redirect on the same host, and reports where it ended', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(302, '', { location: '/v2/ghost-app.json' })
        .get('/v2/ghost-app.json')
        .reply(200, 'Hello');

      const result = await fetcher()(APP_URL, OPTIONS);

      assert.deepEqual(result, {
        success: true,
        url: 'https://podcast.example.com/v2/ghost-app.json',
        text: 'Hello',
      });
    });

    it('reports where a redirect that carries credentials ended, without them', async function () {
      const location = Object.assign(new URL('https://podcast.example.com/v2/ghost-app.json'), {
        username: 'user',
        password: 'example',
      }).href;
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(302, '', { location })
        .get('/v2/ghost-app.json')
        .reply(200, 'Hello');

      const result = await fetcher()(APP_URL, OPTIONS);

      assert.equal(read(result).url, 'https://podcast.example.com/v2/ghost-app.json');
    });

    it('follows a redirect to a path with characters outside ASCII', async function () {
      // On the wire the location is UTF-8 bytes, which Node hands over as latin1.
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(302, '', {
          location: Buffer.from('/épisodes/ghost-app.json', 'utf8').toString('latin1'),
        })
        .get('/%C3%A9pisodes/ghost-app.json')
        .reply(200, 'Hello');

      const result = await fetcher()(APP_URL, OPTIONS);

      assert.equal(read(result).url, 'https://podcast.example.com/%C3%A9pisodes/ghost-app.json');
    });

    it('follows three redirects', async function () {
      const scope = nock('https://podcast.example.com');
      for (const hop of [1, 2, 3]) {
        scope
          .get(hop === 1 ? '/ghost-app.json' : `/${hop - 1}.json`)
          .reply(302, '', { location: `/${hop}.json` });
      }
      scope.get('/3.json').reply(200, 'Hello');

      const result = await fetcher()(APP_URL, OPTIONS);

      assert.equal(read(result).url, 'https://podcast.example.com/3.json');
      assert.equal(scope.isDone(), true);
    });

    it('follows at most three redirects', async function () {
      const scope = nock('https://podcast.example.com');
      for (const hop of [1, 2, 3, 4]) {
        scope
          .get(hop === 1 ? '/ghost-app.json' : `/${hop - 1}.json`)
          .reply(302, '', { location: `/${hop}.json` });
      }
      const end = nock('https://podcast.example.com').get('/4.json').reply(200, 'Hello');

      const failure = unreachable(await fetcher()(APP_URL, OPTIONS));

      assert.equal(failure.status, 302);
      assert.equal(end.isDone(), false);
    });

    it('follows a redirect from HTTP to HTTPS on the same host', async function () {
      nock('http://podcast.example.com')
        .get('/ghost-app.json')
        .reply(301, '', { location: APP_URL });
      nock('https://podcast.example.com').get('/ghost-app.json').reply(200, 'Hello');

      const result = await fetcher()('http://podcast.example.com/ghost-app.json', OPTIONS);

      assert.equal(read(result).url, APP_URL);
    });

    it.each([
      [
        'http://podcast.example.com/ghost-app.json',
        'https://elsewhere.example.net/ghost-app.json',
        'elsewhere.example.net',
      ],
      ['http://podcast.example.com:8080/ghost-app.json', APP_URL, 'podcast.example.com'],
      [
        'http://podcast.example.com/ghost-app.json',
        'https://podcast.example.com:8443/ghost-app.json',
        'podcast.example.com:8443',
      ],
    ])(
      'refuses an upgrade from %s to %s, on another host or port',
      async function (from, to, host) {
        nock(new URL(from).origin).get('/ghost-app.json').reply(301, '', { location: to });

        const result = await fetcher()(from, OPTIONS);

        assert.deepEqual(result, { success: false, failure: { reason: 'redirected', host } });
      },
    );

    it('judges each redirect against the one before it, not the first URL', async function () {
      nock('http://podcast.example.com')
        .get('/ghost-app.json')
        .reply(301, '', { location: APP_URL });
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(302, '', { location: 'http://podcast.example.com/v2/ghost-app.json' });

      const result = await fetcher()('http://podcast.example.com/ghost-app.json', OPTIONS);

      assert.deepEqual(result, {
        success: false,
        failure: { reason: 'redirected', host: 'podcast.example.com' },
      });
    });

    // Whichever statuses got follows, a Location to another host is never followed.
    it.each([300, 301, 302, 303, 304, 305, 306, 307, 308, 399])(
      'refuses a redirect to another host on HTTP %i, without contacting it',
      async function (status) {
        nock('https://podcast.example.com')
          .get('/ghost-app.json')
          .reply(status, '', { location: 'https://elsewhere.example.net/ghost-app.json' });
        const elsewhere = nock('https://elsewhere.example.net')
          .get('/ghost-app.json')
          .reply(200, 'Hello');

        const result = await fetcher()(APP_URL, OPTIONS);

        assert.deepEqual(result, {
          success: false,
          failure: { reason: 'redirected', host: 'elsewhere.example.net' },
        });
        assert.equal(elsewhere.isDone(), false);
      },
    );

    it('refuses a redirect to another port on the same host', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(302, '', { location: 'https://podcast.example.com:8443/ghost-app.json' });

      const result = await fetcher()(APP_URL, OPTIONS);

      assert.deepEqual(result, {
        success: false,
        failure: { reason: 'redirected', host: 'podcast.example.com:8443' },
      });
    });

    it('refuses a redirect to a Location that is not a URL, with its status', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(302, '', { location: 'http://[bad' });

      const result = await fetcher()(APP_URL, OPTIONS);

      assert.deepEqual(result, {
        success: false,
        failure: { reason: 'location_not_url', status: 302 },
      });
    });

    // got asks whether to follow on every response, so a Location header on one it does not
    // follow must not be read as a redirect.
    it.each(['/v2/ghost-app.json', 'https://elsewhere.example.net/ghost-app.json'])(
      'reads a successful response that carries a Location header of %s',
      async function (location) {
        nock('https://podcast.example.com')
          .get('/ghost-app.json')
          .reply(200, 'Hello', { location });

        const result = await fetcher()(APP_URL, OPTIONS);

        assert.deepEqual(result, { success: true, url: APP_URL, text: 'Hello' });
      },
    );

    it('reports an error page with a Location header on another host as unreachable, with its status', async function () {
      nock('https://podcast.example.com')
        .get('/ghost-app.json')
        .reply(404, '', { location: 'https://elsewhere.example.net/ghost-app.json' });

      const failure = unreachable(await fetcher()(APP_URL, OPTIONS));

      assert.equal(failure.status, 404);
    });
  });

  describe('the localhost alias', function () {
    const alias = 'host.docker.internal';

    it('reads localhost through the alias with the original host, and reports the localhost URL', async function () {
      nock('http://host.docker.internal:8787', { reqheaders: { host: 'localhost:8787' } })
        .get('/ghost-app.json')
        .reply(200, 'Hello');

      const result = await fetcher({ alias })('http://localhost:8787/ghost-app.json', OPTIONS);

      assert.deepEqual(result, {
        success: true,
        url: 'http://localhost:8787/ghost-app.json',
        text: 'Hello',
      });
    });

    it('treats any localhost name the manifest rules accept as localhost', async function () {
      nock('http://host.docker.internal:8787', { reqheaders: { host: 'podcast.localhost:8787' } })
        .get('/ghost-app.json')
        .reply(200, 'Hello');

      const result = await fetcher({ alias })(
        'http://podcast.localhost:8787/ghost-app.json',
        OPTIONS,
      );

      assert.equal(read(result).url, 'http://podcast.localhost:8787/ghost-app.json');
    });

    it('leaves hosts other than localhost alone', async function () {
      nock('https://podcast.example.com').get('/ghost-app.json').reply(200, 'Hello');

      const result = await fetcher({ alias })(APP_URL, OPTIONS);

      assert.deepEqual(result, { success: true, url: APP_URL, text: 'Hello' });
    });

    it('follows a redirect on localhost through the alias too, with the original host', async function () {
      nock('http://host.docker.internal:8787', { reqheaders: { host: 'localhost:8787' } })
        .get('/ghost-app.json')
        .reply(302, '', { location: 'http://localhost:8787/v2/ghost-app.json' })
        .get('/v2/ghost-app.json')
        .reply(200, 'Hello');

      const result = await fetcher({ alias })('http://localhost:8787/ghost-app.json', OPTIONS);

      assert.equal(read(result).url, 'http://localhost:8787/v2/ghost-app.json');
    });

    // A relative redirect resolves against the aliased URL Ghost actually requested, so it
    // lands on the alias host and must be read as the localhost it stands for.
    it('follows a relative redirect through the alias as a redirect on localhost', async function () {
      nock('http://host.docker.internal:8787', { reqheaders: { host: 'localhost:8787' } })
        .get('/ghost-app.json')
        .reply(302, '', { location: '/v2/ghost-app.json' })
        .get('/v2/ghost-app.json')
        .reply(200, 'Hello');

      const result = await fetcher({ alias })('http://localhost:8787/ghost-app.json', OPTIONS);

      assert.equal(read(result).url, 'http://localhost:8787/v2/ghost-app.json');
    });

    it('reports where a redirect through the alias ended, whatever Location the final response carries', async function () {
      nock('http://host.docker.internal:8787', { reqheaders: { host: 'localhost:8787' } })
        .get('/ghost-app.json')
        .reply(302, '', { location: '/v2/ghost-app.json' })
        .get('/v2/ghost-app.json')
        .reply(200, 'Hello', { location: '/v3/ghost-app.json' });

      const result = await fetcher({ alias })('http://localhost:8787/ghost-app.json', OPTIONS);

      assert.equal(read(result).url, 'http://localhost:8787/v2/ghost-app.json');
    });
  });
});
