import assert from 'node:assert/strict';
import path from 'node:path';
import nock from 'nock';
import sinon from 'sinon';

// Use the same classes and dependency objects as the CommonJS root.
const OEmbedService = require('../../../../../core/server/services/oembed/oembed-service');
const NFTOEmbedProvider = require('../../../../../core/server/services/oembed/nft-oembed-provider');
const TwitterOEmbedProvider = require('../../../../../core/server/services/oembed/twitter-oembed-provider');
const WebmentionMetadata = require('../../../../../core/server/services/mentions/webmention-metadata');
const {
  RecommendationMetadataService,
}: typeof import('../../../../../core/server/services/recommendations/service/recommendation-metadata-service') = require('../../../../../core/server/services/recommendations/service/recommendation-metadata-service');
const oembedEndpoint = require('../../../../../core/server/api/endpoints/oembed');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const config = require('../../../../../core/shared/config');
const externalRequest = require('../../../../../core/server/lib/request-external');
const logging = require('@tryghost/logging');
const { mockManager } = require('../../../../utils/e2e-framework');

const rootDirectory = path.resolve(__dirname, '../../../../../core/server/services/oembed');
// index.js forwards service.js, so both entries reload together.
const rootModules = [require.resolve(rootDirectory), path.join(rootDirectory, 'service.js')];

const OPENSEA_URL =
  'https://opensea.io/assets/ethereum/0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb/9998';
const TWEET_URL = 'https://twitter.com/Ghost/status/1630581157568839683';

describe('oEmbed service root', function () {
  const sandbox = sinon.createSandbox();

  afterEach(function () {
    sandbox.restore();
    mockManager.restore();
  });

  describe('composition', function () {
    let savedModules: (NodeJS.Module | undefined)[];
    let getAdapter: sinon.SinonStub;
    let getConfig: sinon.SinonStub;
    let imageStore: { getSanitizedFileName: sinon.SinonStub; saveRaw: sinon.SinonStub };

    function loadRoot() {
      return require(rootDirectory);
    }

    beforeEach(function () {
      // The unit project shares one module registry. Each test loads a fresh
      // root and restores the original for the consumers that captured it.
      savedModules = rootModules.map((modulePath) => require.cache[modulePath]);
      for (const modulePath of rootModules) {
        delete require.cache[modulePath];
      }
      imageStore = {
        getSanitizedFileName: sandbox.stub().returns('icon'),
        saveRaw: sandbox.stub().resolves('https://storage.example/icon/icon.png'),
      };
      getAdapter = sandbox.stub(adapterManager, 'getAdapter').callThrough();
      getAdapter.withArgs('storage:images').returns(imageStore);
      getConfig = sandbox.stub(config, 'get').callThrough();
      getConfig.withArgs('opensea').returns({ privateReadOnlyApiKey: 'opensea-key' });
      getConfig.withArgs('twitter').returns({ privateReadOnlyToken: 'twitter-token' });
    });

    afterEach(function () {
      rootModules.forEach((modulePath, index) => {
        delete require.cache[modulePath];
        if (savedModules[index]) {
          require.cache[modulePath] = savedModules[index];
        }
      });
    });

    it('composes one OEmbedService during import from the shared config, request client and images adapter', function () {
      const root = loadRoot();

      // Composition happens while the module is required, before any operation runs.
      sinon.assert.calledOnceWithExactly(getAdapter, 'storage:images');
      assert.ok(root instanceof OEmbedService);
      assert.equal(root.config, config);
      assert.equal(root.externalRequest, externalRequest);
      assert.equal(root.imageStore, imageStore);
    });

    it('registers exactly the NFT provider and then the Twitter provider', function () {
      const root = loadRoot();

      assert.equal(root.customProviders.length, 2);
      assert.ok(root.customProviders[0] instanceof NFTOEmbedProvider);
      assert.ok(root.customProviders[1] instanceof TwitterOEmbedProvider);
    });

    it('returns the same instance from repeated imports without composing again', function () {
      const root = loadRoot();

      assert.equal(loadRoot(), root);
      assert.equal(require(rootModules[1]), root);
      sinon.assert.calledOnce(getAdapter);
      assert.equal(root.customProviders.length, 2);
    });

    it('copies provider credentials at import rather than reading config per request', async function () {
      const root = loadRoot();
      getConfig.withArgs('opensea').returns({ privateReadOnlyApiKey: 'rotated-opensea-key' });
      getConfig.withArgs('twitter').returns({ privateReadOnlyToken: 'rotated-twitter-token' });
      mockManager.disableNetwork();
      nock('https://publish.twitter.com')
        .get('/oembed')
        .query(true)
        .reply(200, { type: 'rich', version: '1.0', html: '<blockquote>Tweet</blockquote>' });
      const api = nock('https://api.twitter.com', {
        reqheaders: { authorization: 'Bearer twitter-token' },
      })
        .get('/2/tweets/1630581157568839683')
        .query(true)
        .reply(200, { data: { id: '1630581157568839683' }, includes: { users: [] } });

      const embed = await root.fetchOembedDataFromUrl(TWEET_URL);

      assert.equal(api.isDone(), true);
      assert.equal(embed.type, 'twitter');
      assert.deepEqual(embed.tweet_data, { id: '1630581157568839683', includes: { users: [] } });
      assert.deepEqual(root.customProviders[0].dependencies.config, { apiKey: 'opensea-key' });
    });

    it('stores bookmark images through the images adapter captured at import', async function () {
      const root = loadRoot();
      const laterStore = { saveRaw: sandbox.stub() };
      getAdapter.withArgs('storage:images').returns(laterStore);
      // 1x1 PNG
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      );
      sandbox.stub(root, 'fetchImageBuffer').resolves(png);

      const stored = await root.processImageFromUrl('https://source.example/icon.png', 'icon');

      assert.equal(stored, 'https://storage.example/icon/icon.png');
      sinon.assert.calledOnce(imageStore.saveRaw);
      assert.match(imageStore.saveRaw.firstCall.args[1], /^icon\/icon-[0-9a-f-]{36}\.png$/);
      sinon.assert.notCalled(laterStore.saveRaw);
    });

    it('rejects the import when a provider config subtree is missing, and a later import composes afresh', function () {
      getConfig.withArgs('opensea').returns(undefined);

      assert.throws(() => loadRoot(), TypeError);
      for (const modulePath of rootModules) {
        assert.equal(require.cache[modulePath], undefined, modulePath);
      }

      getConfig.withArgs('opensea').returns({ privateReadOnlyApiKey: 'opensea-key' });
      const root = loadRoot();

      sinon.assert.calledTwice(getAdapter);
      assert.ok(root instanceof OEmbedService);
      assert.equal(root.customProviders.length, 2);
    });

    it('rejects the import with the adapter error and leaves nothing cached', function () {
      const failure = new Error('Storage adapter unavailable');
      getAdapter.withArgs('storage:images').throws(failure);

      assert.throws(
        () => loadRoot(),
        (error: unknown) => error === failure,
      );
      for (const modulePath of rootModules) {
        assert.equal(require.cache[modulePath], undefined, modulePath);
      }
    });
  });

  describe('receivers and consumers', function () {
    // Consumers captured the shared root when they were imported, so these
    // tests use that instance rather than a fresh one.
    const root = require(rootDirectory);

    it('needs its instance as the receiver for operations', async function () {
      const { fetchPageHtml, fetchOembedDataFromUrl } = root;

      await assert.rejects(fetchPageHtml('https://source.example/'), TypeError);
      await assert.rejects(fetchOembedDataFromUrl('https://source.example/'), TypeError);
    });

    it('serves the Admin endpoint by calling the shared instance', async function () {
      const embed = { version: '1.0', type: 'video' };
      const fetch = sandbox.stub(root, 'fetchOembedDataFromUrl').resolves(embed);

      const result = await oembedEndpoint.read.query({
        data: { url: 'https://source.example/', type: 'embed' },
      });

      assert.equal(result, embed);
      sinon.assert.calledOnceWithExactly(fetch, 'https://source.example/', 'embed');
      sinon.assert.calledOn(fetch, root);
    });

    it('serves mention metadata and recommendation fallback by calling the shared instance', async function () {
      const fetch = sandbox.stub(root, 'fetchOembedDataFromUrl').resolves({
        metadata: { title: 'Title', description: null, publisher: null, author: null },
      });
      const recommendations = new RecommendationMetadataService({
        oembedService: root,
        externalRequest: { get: sandbox.stub().resolves({ statusCode: 404, body: '' }) },
      });

      await new WebmentionMetadata({ oembedService: root }).fetch(
        new URL('https://source.example/'),
      );
      await recommendations.fetch(new URL('https://source.example/'));

      sinon.assert.calledTwice(fetch);
      sinon.assert.alwaysCalledOn(fetch, root);
    });

    describe('custom providers', function () {
      const cases = [
        { provider: 0, name: 'NFT', url: OPENSEA_URL },
        { provider: 1, name: 'Twitter', url: TWEET_URL },
      ];

      for (const { provider, name, url } of cases) {
        for (const type of ['mention', 'bookmark', 'embed', undefined]) {
          it(`returns the ${name} provider result for ${type ?? 'untyped'} requests without page or image dispatch`, async function () {
            const embed = { version: '1.0', type: name.toLowerCase(), title: name };
            const getOEmbedData = sandbox
              .stub(root.customProviders[provider], 'getOEmbedData')
              .resolves(embed);
            const request = sandbox.stub(root, 'externalRequest');
            const processImage = sandbox.spy(root, 'processImageFromUrl');

            const result = await root.fetchOembedDataFromUrl(url, type);

            assert.equal(result, embed);
            sinon.assert.calledOnce(getOEmbedData);
            assert.equal(getOEmbedData.firstCall.args[0].href, url);
            assert.equal(getOEmbedData.firstCall.args[1], request);
            sinon.assert.notCalled(request);
            sinon.assert.notCalled(processImage);
          });
        }
      }

      it('passes a custom provider result without metadata to mention metadata, which cannot read it', async function () {
        // Custom providers bypass mention dispatch, so their results carry no
        // metadata or body. WebmentionMetadata dereferences metadata unguarded.
        // This pins current behaviour, not a desired contract.
        sandbox
          .stub(root.customProviders[1], 'getOEmbedData')
          .resolves({ version: '1.0', type: 'twitter', html: '<blockquote>Tweet</blockquote>' });

        await assert.rejects(
          new WebmentionMetadata({ oembedService: root }).fetch(new URL(TWEET_URL)),
          TypeError,
        );
      });

      it('falls back to empty recommendation metadata for a custom provider result', async function () {
        sandbox.stub(root.customProviders[0], 'getOEmbedData').resolves({
          version: '1.0',
          type: 'nft',
          title: 'NFT',
          image_url: 'https://x.example/a.png',
        });
        const recommendations = new RecommendationMetadataService({
          oembedService: root,
          externalRequest: { get: sandbox.stub().resolves({ statusCode: 404, body: '' }) },
        });

        const metadata = await recommendations.fetch(new URL(OPENSEA_URL));

        assert.deepEqual(metadata, {
          title: null,
          excerpt: null,
          featuredImage: null,
          favicon: null,
          oneClickSubscribe: false,
        });
      });
    });

    describe('mention pages', function () {
      beforeEach(function () {
        mockManager.disableNetwork();
        sandbox.stub(logging, 'error');
      });

      it('returns empty metadata with the body and content type for a JSON page', async function () {
        const body = JSON.stringify({ items: [] });
        nock('https://source.example')
          .get('/feed.json')
          .reply(200, body, { 'content-type': 'application/json' });

        const result = await root.fetchOembedDataFromUrl(
          'https://source.example/feed.json',
          'mention',
        );

        assert.deepEqual(result, {
          version: '1.0',
          type: 'bookmark',
          url: 'https://source.example/feed.json',
          metadata: {
            title: null,
            description: null,
            publisher: null,
            author: null,
            thumbnail: null,
            icon: null,
          },
          contentType: 'application/json',
          body,
        });
      });

      it('maps a JSON page to empty mention metadata with its body', async function () {
        const body = JSON.stringify({ items: [] });
        nock('https://source.example')
          .get('/feed.json')
          .reply(200, body, { 'content-type': 'application/json' });

        const result = await new WebmentionMetadata({ oembedService: root }).fetch(
          new URL('https://source.example/feed.json'),
        );

        assert.deepEqual(result, {
          siteTitle: null,
          title: null,
          excerpt: null,
          author: null,
          image: null,
          favicon: null,
          body,
          contentType: 'application/json',
        });
      });

      it('rejects a page without a content type as an unknown provider and logs the cause', async function () {
        nock('https://source.example').get('/raw').reply(200, Buffer.from('<p>Raw</p>'));

        await assert.rejects(root.fetchOembedDataFromUrl('https://source.example/raw', 'mention'), {
          name: 'ValidationError',
          message: 'No provider found for supplied URL.',
          context: 'https://source.example/raw',
        });
        sinon.assert.calledOnce(logging.error);
        const logged = logging.error.firstCall.args[0];
        assert.equal(logged.message, 'Encountered error when fetching oembed');
        // The wrapped cause is the missing header's contentType.includes call.
        assert.match(logged.stack, /^TypeError: .*reading 'includes'/);
      });

      it('rejects a plain-text page for insufficient metadata', async function () {
        nock('https://source.example')
          .get('/notes.txt')
          .reply(200, 'Plain notes', { 'content-type': 'text/plain' });

        await assert.rejects(
          root.fetchOembedDataFromUrl('https://source.example/notes.txt', 'mention'),
          {
            name: 'ValidationError',
            message: 'URL contains insufficient metadata.',
            context: 'https://source.example/notes.txt',
          },
        );
      });
    });
  });
});
