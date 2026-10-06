import assert from 'node:assert/strict';
import got from 'got';
import nock from 'nock';
import { createManifestFetcher } from '../../../../../core/server/services/app-installations/fetch-manifest';

const MANIFEST = { id: 'com.example.podcast' };

describe('createManifestFetcher', function () {
  beforeAll(function () {
    nock.disableNetConnect();
  });

  afterEach(function () {
    nock.cleanAll();
  });

  afterAll(function () {
    nock.enableNetConnect();
  });

  const fetcher = (alias: string | null = null) =>
    createManifestFetcher({ request: got, getLocalhostAlias: () => alias });

  it('fetches a manifest and says where it was read from', async function () {
    nock('https://podcast.example.com').get('/ghost-app.json').reply(200, MANIFEST);

    const result = await fetcher()('https://podcast.example.com/ghost-app.json');

    assert.deepEqual(result, { url: 'https://podcast.example.com/ghost-app.json', body: MANIFEST });
  });

  it('reads a localhost manifest through the alias, keeping its own address', async function () {
    nock('http://host.docker.internal:8787', { reqheaders: { host: 'localhost:8787' } })
      .get('/ghost-app.json')
      .reply(200, MANIFEST);

    const result = await fetcher('host.docker.internal')('http://localhost:8787/ghost-app.json');

    assert.equal(result.url, 'http://localhost:8787/ghost-app.json');
    assert.deepEqual(result.body, MANIFEST);
  });

  it('treats any localhost name the manifest rules accept as localhost', async function () {
    nock('http://host.docker.internal:8787', { reqheaders: { host: 'podcast.localhost:8787' } })
      .get('/ghost-app.json')
      .reply(200, MANIFEST);

    const result = await fetcher('host.docker.internal')(
      'http://podcast.localhost:8787/ghost-app.json',
    );

    assert.equal(result.url, 'http://podcast.localhost:8787/ghost-app.json');
  });

  it('follows a redirect on localhost through the alias too', async function () {
    nock('http://host.docker.internal:8787')
      .get('/ghost-app.json')
      .reply(302, '', { location: 'http://localhost:8787/v2/ghost-app.json' })
      .get('/v2/ghost-app.json')
      .reply(200, MANIFEST);

    const result = await fetcher('host.docker.internal')('http://localhost:8787/ghost-app.json');

    assert.equal(result.url, 'http://localhost:8787/v2/ghost-app.json');
  });

  it('leaves addresses other than localhost alone', async function () {
    nock('https://podcast.example.com').get('/ghost-app.json').reply(200, MANIFEST);

    const result = await fetcher('host.docker.internal')(
      'https://podcast.example.com/ghost-app.json',
    );

    assert.deepEqual(result.body, MANIFEST);
  });

  it('allows a redirect from HTTP to HTTPS on the same host', async function () {
    nock('http://podcast.example.com')
      .get('/ghost-app.json')
      .reply(301, '', { location: 'https://podcast.example.com/ghost-app.json' });
    nock('https://podcast.example.com').get('/ghost-app.json').reply(200, MANIFEST);

    const result = await fetcher()('http://podcast.example.com/ghost-app.json');

    assert.equal(result.url, 'https://podcast.example.com/ghost-app.json');
  });

  it('refuses a redirect to another port on the same host', async function () {
    nock('http://localhost:8787')
      .get('/ghost-app.json')
      .reply(302, '', { location: 'http://localhost:9999/ghost-app.json' });

    await assert.rejects(fetcher()('http://localhost:8787/ghost-app.json'), {
      code: 'APP_MANIFEST_REDIRECTED',
    });
  });

  it('accepts a manifest that starts with a byte order mark', async function () {
    nock('https://podcast.example.com')
      .get('/ghost-app.json')
      .reply(200, String.fromCharCode(0xfeff) + JSON.stringify(MANIFEST));

    const result = await fetcher()('https://podcast.example.com/ghost-app.json');

    assert.deepEqual(result.body, MANIFEST);
  });
});
