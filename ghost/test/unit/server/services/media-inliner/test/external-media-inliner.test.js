const assert = require('node:assert/strict');
const dnsPromises = require('dns').promises;
const fs = require('fs');
const sinon = require('sinon');
const nock = require('nock');
const path = require('path');
const { createLoggingFake } = require('../../../../../utils/logging-utils');
const configUtils = require('../../../../../utils/config-utils');
const urlUtilsHelper = require('../../../../../utils/url-utils');
const request = require('../../../../../../core/server/lib/request-external');
const urlUtils = require('../../../../../../core/shared/url-utils').default;
const ExternalMediaInliner = require('../../../../../../core/server/services/media-inliner/external-media-inliner');
const {
  createOriginSchemes,
} = require('../../../../../../core/server/services/media-inliner/origin-schemes');

let logging;

// The root supplies these collaborators in production; the tests keep the real ones.
const createInliner = (deps = {}) =>
  new ExternalMediaInliner({
    logging,
    request,
    urlUtils,
    loadFileType: () => import('file-type'),
    loadHeicConvert: () => require('heic-convert'),
    ...deps,
  });

describe('ExternalMediaInliner', function () {
  let ghostLogoPng;
  let exeFile;
  let heicFile;
  let heifFile;
  let GIF1x1;
  let postModelStub;
  let postMetaModelStub;
  let tagModelStub;
  let userModelStub;

  beforeEach(function () {
    // use a 1x1 gif in nock responses because it's really small and easy to work with
    ghostLogoPng = fs.readFileSync(path.join(__dirname, 'fixtures', 'ghost-logo.png'));
    exeFile = fs.readFileSync(path.join(__dirname, 'fixtures', 'fixture.exe'));
    heicFile = fs.readFileSync(path.join(__dirname, 'fixtures', 'image.heic'));
    heifFile = fs.readFileSync(path.join(__dirname, 'fixtures', 'image.heif'));
    GIF1x1 = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');
    logging = createLoggingFake();

    postModelStub = {
      findAll: sinon.stub().resolves([]),
      edit: sinon.stub().resolves(),
    };
    postMetaModelStub = {
      findPage: sinon.stub().resolves({
        data: [],
      }),
      edit: sinon.stub().resolves(),
    };
    tagModelStub = {
      findPage: sinon.stub().resolves({
        data: [],
      }),
      edit: sinon.stub().resolves(),
    };
    userModelStub = {
      findPage: sinon.stub().resolves({
        data: [],
      }),
      edit: sinon.stub().resolves(),
    };
  });

  afterEach(function () {
    sinon.restore();
    nock.cleanAll();
  });

  it('Creates an External Media Inliner instance', function () {
    assert.ok(createInliner({}));
  });

  describe('importUrl', function () {
    function harness() {
      const response = { body: Buffer.from('media') };
      const media = { fileBuffer: response.body, filename: 'media.jpg', extension: '.jpg' };
      const inliner = createInliner({});
      const getRemoteMedia = sinon.stub(inliner, 'getRemoteMedia').resolves(response);
      const extractFileDataFromResponse = sinon
        .stub(inliner, 'extractFileDataFromResponse')
        .resolves(media);
      const storeMediaLocally = sinon
        .stub(inliner, 'storeMediaLocally')
        .resolves('__GHOST_URL__/content/images/media.jpg');

      return {
        inliner,
        response,
        media,
        getRemoteMedia,
        extractFileDataFromResponse,
        storeMediaLocally,
      };
    }

    it('downloads, extracts, and stores one source URL', async function () {
      const h = harness();
      const sourceUrl = 'https://example.com/media.jpg';

      const result = await h.inliner.importUrl(sourceUrl);

      assert.deepEqual(result, {
        status: 'stored',
        sourceUrl,
        storedUrl: '__GHOST_URL__/content/images/media.jpg',
      });
      sinon.assert.calledWithExactly(h.getRemoteMedia, sourceUrl, { originSchemes: undefined });
      sinon.assert.calledWithExactly(h.extractFileDataFromResponse, sourceUrl, h.response);
      sinon.assert.calledWithExactly(h.storeMediaLocally, h.media);
    });

    it('returns a typed download failure when fetching throws', async function () {
      const h = harness();
      const error = new Error('network unavailable');
      h.getRemoteMedia.rejects(error);

      const result = await h.inliner.importUrl('https://example.com/media.jpg');

      assert.deepEqual(result, {
        status: 'failed',
        sourceUrl: 'https://example.com/media.jpg',
        stage: 'download',
        reason: 'The media file could not be downloaded.',
        error,
      });
      sinon.assert.notCalled(h.extractFileDataFromResponse);
    });

    it('returns a typed download failure when fetching produces no response', async function () {
      const h = harness();
      h.getRemoteMedia.resolves(null);

      const result = await h.inliner.importUrl('https://example.com/media.jpg');

      assert.deepEqual(result, {
        status: 'failed',
        sourceUrl: 'https://example.com/media.jpg',
        stage: 'download',
        reason: 'The media file could not be downloaded.',
      });
      sinon.assert.notCalled(h.extractFileDataFromResponse);
    });

    it('returns a typed extraction failure', async function () {
      const h = harness();
      const error = new Error('invalid media');
      h.extractFileDataFromResponse.rejects(error);

      const result = await h.inliner.importUrl('https://example.com/media.jpg');

      assert.deepEqual(result, {
        status: 'failed',
        sourceUrl: 'https://example.com/media.jpg',
        stage: 'extract',
        reason: 'The downloaded media file could not be read.',
        error,
      });
      sinon.assert.notCalled(h.storeMediaLocally);
    });

    it('returns a typed unsupported-media failure', async function () {
      const h = harness();
      h.storeMediaLocally.resolves(null);

      const result = await h.inliner.importUrl('https://example.com/media.exe');

      assert.deepEqual(result, {
        status: 'failed',
        sourceUrl: 'https://example.com/media.exe',
        stage: 'unsupported',
        reason: 'No configured storage accepts this media file.',
      });
    });

    it('returns a typed storage failure', async function () {
      const h = harness();
      const error = new Error('storage unavailable');
      h.storeMediaLocally.rejects(error);

      const result = await h.inliner.importUrl('https://example.com/media.jpg');

      assert.deepEqual(result, {
        status: 'failed',
        sourceUrl: 'https://example.com/media.jpg',
        stage: 'storage',
        reason: 'The media file could not be stored in Ghost.',
        error,
      });
    });

    it('preserves legacy processing errors at the existing catch boundary', async function () {
      const inliner = createInliner({});
      const error = new Error('could not inspect media');
      sinon.stub(inliner, 'importUrl').resolves({
        status: 'failed',
        sourceUrl: 'https://example.com/media.jpg',
        stage: 'extract',
        reason: 'The downloaded media file could not be read.',
        error,
      });

      await assert.rejects(
        inliner.inlineContent('{"src":"https://example.com/media.jpg"}', ['https://example.com']),
        (thrown) => thrown === error,
      );
    });

    it('preserves legacy falsy thrown values at the existing catch boundary', async function () {
      const inliner = createInliner({});
      sinon.stub(inliner, 'importUrl').resolves({
        status: 'failed',
        sourceUrl: 'https://example.com/media.jpg',
        stage: 'extract',
        reason: 'The downloaded media file could not be read.',
        error: null,
      });

      await inliner
        .inlineContent('{"src":"https://example.com/media.jpg"}', ['https://example.com'])
        .then(
          () => assert.fail('Expected inlineContent to reject'),
          (error) => assert.equal(error, null),
        );
    });
  });

  describe('inline', function () {
    it("inlines image in the post's mobiledoc content", async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/image.jpg';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/image.jpg')
        .reply(200, GIF1x1);

      const postStub = sinon.stub();
      postStub
        .withArgs('mobiledoc')
        .returns(`{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"${imageURL}"}]]}`);
      postStub.withArgs('lexical').returns(null);

      const postModelInstanceStub = {
        id: 'inlined-post-id',
        get: postStub,
      };
      postModelStub = {
        findAll: sinon.stub().returns([postModelInstanceStub]),
        edit: sinon.stub().resolves(),
      };

      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-image.jpg')
        .returns('unique-image.jpg');
      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon
          .stub()
          .withArgs('.jpg')
          .returns({
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-image.jpg',
            saveRaw: () => '/content/images/unique-image.jpg',
          }),
      });

      await inliner.inline(['https://img.stockfresh.com']);

      assert.ok(requestMock.isDone());
      sinon.assert.calledOnce(postModelStub.edit);
      sinon.assert.calledWith(
        postModelStub.edit,
        {
          mobiledoc:
            '{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"__GHOST_URL__/content/images/unique-image.jpg"}]]}',
        },
        {
          id: 'inlined-post-id',
          context: {
            internal: true,
          },
        },
      );
    });

    it("inlines the image from post's mobiledoc containing html card", async function () {
      const imageURL =
        'https://bucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com/public/images/39719fcb-5af0-4764-bf8b-d375f37a09e5_1141x860';
      const requestMock = nock(
        'https://bucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com',
      )
        .get('/public/images/39719fcb-5af0-4764-bf8b-d375f37a09e5_1141x860')
        .reply(200, GIF1x1);

      const postStub = sinon.stub();
      postStub
        .withArgs('mobiledoc')
        .returns(
          `{"version":"0.3.1","atoms":[],"cards":[["html",{"html":"<img src="${imageURL}" alt="Lorem ipsum">"}]],"markups":[],"sections":[[10,0],[1,"p",[]]],"ghostVersion":"4.0"}`,
        );
      postStub.withArgs('lexical').returns(null);

      const postModelInstanceStub = {
        id: 'inlined-post-with-htmlcard-id',
        get: postStub,
      };

      postModelStub = {
        findAll: sinon.stub().returns([postModelInstanceStub]),
        edit: sinon.stub().resolves(),
      };

      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-image.jpg')
        .returns('unique-image.jpg');
      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon
          .stub()
          .withArgs('.jpg')
          .returns({
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-image.jpg',
            saveRaw: () => '/content/images/unique-image.jpg',
          }),
      });

      await inliner.inline([
        'https://bucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com',
      ]);

      assert.ok(requestMock.isDone());
      sinon.assert.calledOnce(postModelStub.edit);
      assert.deepEqual(postModelStub.edit.args[0][0], {
        mobiledoc: `{"version":"0.3.1","atoms":[],"cards":[["html",{"html":"<img src="__GHOST_URL__/content/images/unique-image.jpg" alt="Lorem ipsum">"}]],"markups":[],"sections":[[10,0],[1,"p",[]]],"ghostVersion":"4.0"}`,
      });
      assert.deepEqual(postModelStub.edit.args[0][1], {
        id: 'inlined-post-with-htmlcard-id',
        context: {
          internal: true,
        },
      });
    });

    it("inlines image in the post's lexical content", async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/image.jpg';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/image.jpg')
        .reply(200, GIF1x1);

      const postStub = sinon.stub();
      postStub.withArgs('mobiledoc').returns(null);
      postStub
        .withArgs('lexical')
        .returns(
          `{"root":{"children":[{"type":"image","version":1,"src":"${imageURL}","width":1480,"height":486,"title":"","alt":"","caption":"","cardWidth":"regular","href":""}],"direction":null,"format":"","indent":0,"type":"root","version":1}}`,
        );

      const postModelInstanceStub = {
        id: 'inlined-post-id',
        get: postStub,
      };
      postModelStub = {
        findAll: sinon.stub().returns([postModelInstanceStub]),
        edit: sinon.stub().resolves(),
      };

      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-image.jpg')
        .returns('unique-image.jpg');
      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon
          .stub()
          .withArgs('.jpg')
          .returns({
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-image.jpg',
            saveRaw: () => '/content/images/unique-image.jpg',
          }),
      });

      await inliner.inline(['https://img.stockfresh.com']);

      assert.ok(requestMock.isDone());
      sinon.assert.calledOnce(postModelStub.edit);
      sinon.assert.calledWith(
        postModelStub.edit,
        {
          lexical:
            '{"root":{"children":[{"type":"image","version":1,"src":"__GHOST_URL__/content/images/unique-image.jpg","width":1480,"height":486,"title":"","alt":"","caption":"","cardWidth":"regular","href":""}],"direction":null,"format":"","indent":0,"type":"root","version":1}}',
        },
        {
          id: 'inlined-post-id',
          context: {
            internal: true,
          },
        },
      );
    });

    it("inlines the image from post's lexical containing html card", async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/image.jpg';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/image.jpg')
        .reply(200, GIF1x1);

      const postStub = sinon.stub();
      postStub.withArgs('mobiledoc').returns(null);
      postStub
        .withArgs('lexical')
        .returns(
          `{"root":{"children":[{"type":"html","version":1,"html":"<img src="${imageURL}" alt="Lorem ipsum">"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}`,
        );

      const postModelInstanceStub = {
        id: 'inlined-post-with-htmlcard-id',
        get: postStub,
      };

      postModelStub = {
        findAll: sinon.stub().returns([postModelInstanceStub]),
        edit: sinon.stub().resolves(),
      };

      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-image.jpg')
        .returns('unique-image.jpg');
      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon
          .stub()
          .withArgs('.jpg')
          .returns({
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-image.jpg',
            saveRaw: () => '/content/images/unique-image.jpg',
          }),
      });

      await inliner.inline(['https://img.stockfresh.com']);

      assert.ok(requestMock.isDone());
      sinon.assert.calledOnce(postModelStub.edit);
      assert.deepEqual(postModelStub.edit.args[0][0], {
        lexical: `{"root":{"children":[{"type":"html","version":1,"html":"<img src="__GHOST_URL__/content/images/unique-image.jpg" alt="Lorem ipsum">"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}`,
      });
      assert.deepEqual(postModelStub.edit.args[0][1], {
        id: 'inlined-post-with-htmlcard-id',
        context: {
          internal: true,
        },
      });
    });

    it('inlines srcset images in a lexical html card', async function () {
      const requestMock = nock('https://example.com')
        .get('/path/to/landscape-1x.jpg')
        .reply(200, GIF1x1)
        .get('/path/to/landscape-2x.jpg')
        .reply(200, GIF1x1)
        .get('/path/to/landscape-original.jpg')
        .reply(200, GIF1x1);

      const postStub = sinon.stub();
      postStub.withArgs('mobiledoc').returns(null);
      postStub
        .withArgs('lexical')
        .returns(
          `{"root":{"children":[{"type":"html","version":1,"html":"<img srcset="https://example.com/path/to/landscape-1x.jpg, https://example.com/path/to/landscape-2x.jpg 2x" src="https://example.com/path/to/landscape-original.jpg" />"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}`,
        );

      const postModelInstanceStub = {
        id: 'inlined-post-with-htmlcard-id',
        get: postStub,
      };

      postModelStub = {
        findAll: sinon.stub().returns([postModelInstanceStub]),
        edit: sinon.stub().resolves(),
      };

      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-image.jpg')
        .returns('unique-image.jpg');
      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon
          .stub()
          .withArgs('.jpg')
          .returns({
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-image.jpg',
            saveRaw: () => '/content/images/unique-image.jpg',
          }),
      });

      await inliner.inline(['https://example.com']);

      assert.ok(requestMock.isDone());
      sinon.assert.calledOnce(postModelStub.edit);
      // NOTE: The file names all being the same as a limitation in how this is stubbed. In production, each image is unique
      assert.deepEqual(postModelStub.edit.args[0][0], {
        lexical: `{"root":{"children":[{"type":"html","version":1,"html":"<img srcset="__GHOST_URL__/content/images/unique-image.jpg, __GHOST_URL__/content/images/unique-image.jpg 2x" src="__GHOST_URL__/content/images/unique-image.jpg" />"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}`,
      });
      assert.deepEqual(postModelStub.edit.args[0][1], {
        id: 'inlined-post-with-htmlcard-id',
        context: {
          internal: true,
        },
      });
    });

    it("inlines image in the post's mobiledoc & lexical content", async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/image.jpg';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/image.jpg')
        .reply(200, GIF1x1)
        .get('/files/f/image.jpg')
        .reply(200, GIF1x1);

      const postStub = sinon.stub();
      postStub
        .withArgs('mobiledoc')
        .returns(`{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"${imageURL}"}]]}`);
      postStub
        .withArgs('lexical')
        .returns(
          `{"root":{"children":[{"type":"image","version":1,"src":"${imageURL}","width":1480,"height":486,"title":"","alt":"","caption":"","cardWidth":"regular","href":""}],"direction":null,"format":"","indent":0,"type":"root","version":1}}`,
        );

      const postModelInstanceStub = {
        id: 'inlined-post-id',
        get: postStub,
      };
      postModelStub = {
        findAll: sinon.stub().returns([postModelInstanceStub]),
        edit: sinon.stub().resolves(),
      };

      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-image.jpg')
        .returns('unique-image.jpg');
      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon
          .stub()
          .withArgs('.jpg')
          .returns({
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-image.jpg',
            saveRaw: () => '/content/images/unique-image.jpg',
          }),
      });

      await inliner.inline(['https://img.stockfresh.com']);

      assert.ok(requestMock.isDone());
      sinon.assert.calledOnce(postModelStub.edit);
      sinon.assert.calledWith(
        postModelStub.edit,
        {
          mobiledoc:
            '{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"__GHOST_URL__/content/images/unique-image.jpg"}]]}',
          lexical:
            '{"root":{"children":[{"type":"image","version":1,"src":"__GHOST_URL__/content/images/unique-image.jpg","width":1480,"height":486,"title":"","alt":"","caption":"","cardWidth":"regular","href":""}],"direction":null,"format":"","indent":0,"type":"root","version":1}}',
        },
        {
          id: 'inlined-post-id',
          context: {
            internal: true,
          },
        },
      );
    });

    it('logs an error when fetching an external media fails', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/image.jpg';
      const requestMock = nock('https://img.stockfresh.com').get('/files/f/image.jpg').reply(404);
      const postModelInstanceStub = {
        id: 'inlined-post-id',
        get: sinon
          .stub()
          .withArgs('mobiledoc')
          .returns(`{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"${imageURL}"}]]}`),
      };

      postModelStub = {
        findAll: sinon.stub().returns([postModelInstanceStub]),
      };

      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
      });

      await inliner.inline(['https://img.stockfresh.com']);

      assert.ok(requestMock.isDone());
      assert.equal(
        logging.error.args[0][0],
        'Error downloading remote media: https://img.stockfresh.com/files/f/image.jpg',
      );
    });

    it('logs an error when fetching an external media for simple fields fails', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/simple-image.jpg';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/simple-image.jpg')
        .reply(500);
      const userModelInstanceStub = {
        id: 'inlined-user-id',
        get: sinon.stub().withArgs('profile_image').returns(imageURL),
      };

      userModelStub = {
        findPage: sinon.stub().returns({
          data: [userModelInstanceStub],
        }),
      };

      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
      });

      await inliner.inline(['https://img.stockfresh.com']);

      assert.ok(requestMock.isDone());
      assert.equal(
        logging.error.args[0][0],
        'Error downloading remote media: https://img.stockfresh.com/files/f/simple-image.jpg',
      );
    });

    it('logs a warning when no suitable storage adapter found for inlined media extension', async function () {
      const fileURL = 'https://img.stockfresh.com/files/f/inlined.exe';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/inlined.exe')
        .reply(200, exeFile);

      const postModelInstanceStub = {
        id: 'inlined-post-id',
        get: sinon
          .stub()
          .withArgs('mobiledoc')
          .returns(`{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"${fileURL}"}]]}`),
      };
      postModelStub = {
        findAll: sinon.stub().returns([postModelInstanceStub]),
        edit: sinon.stub().resolves(),
      };
      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon.stub().withArgs('.exe').returns(null),
      });

      await inliner.inline(['https://img.stockfresh.com']);

      assert.ok(requestMock.isDone());
      sinon.assert.calledOnce(logging.warn);
      assert.equal(logging.warn.args[0][0], 'No storage adapter found for file extension: .exe');
    });

    it('logs an error when handling post inlining throws an error', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/image.jpg';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/image.jpg')
        .reply(200, GIF1x1);

      const postStub = sinon.stub();
      postStub
        .withArgs('mobiledoc')
        .returns(`{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"${imageURL}"}]]}`);
      postStub.withArgs('lexical').returns(null);

      postModelStub = {
        id: 'errored-post-id',
        get: postStub,
      };
      postModelStub = {
        findAll: sinon.stub().returns([postModelStub]),
        edit: sinon.stub().throws(new Error('Error saving the post')),
      };
      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-image.jpg')
        .returns('unique-image.jpg');

      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon
          .stub()
          .withArgs('.jpg')
          .returns({
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-image.jpg',
            saveRaw: () => '/content/images/unique-image.jpg',
          }),
      });

      await inliner.inline(['https://img.stockfresh.com']);

      assert.ok(requestMock.isDone());
      sinon.assert.calledOnce(postModelStub.edit);
      assert.equal(logging.error.args[0][0], 'Error inlining media for post: errored-post-id');
    });

    it('logs an error when handling tag simple fields inlining throws an error', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/simple-image.jpg';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/simple-image.jpg')
        .reply(200, GIF1x1);

      const getMethodStub = sinon.stub();
      getMethodStub.withArgs('feature_image').returns(imageURL);
      getMethodStub.withArgs('og_image').returns(null);
      getMethodStub.withArgs('twitter_image').returns(null);

      const tagModelInstanceStub = {
        id: 'errored-tag-id',
        get: getMethodStub,
      };
      tagModelStub.findPage = sinon.stub().returns({
        data: [tagModelInstanceStub],
      });
      tagModelStub.edit = sinon.stub().throws(new Error('Error saving the tag'));
      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-image.jpg')
        .returns('unique-image.jpg');

      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon
          .stub()
          .withArgs('.jpg')
          .returns({
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-image.jpg',
            saveRaw: () => '/content/images/unique-image.jpg',
          }),
      });

      await inliner.inline(['https://img.stockfresh.com']);

      assert.ok(requestMock.isDone());
      sinon.assert.calledOnce(tagModelStub.edit);
      assert.equal(logging.error.args[0][0], 'Error inlining media for: errored-tag-id');
    });

    it("inlines image in the post's feature_image field", async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/posts_feature_image.jpg';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/posts_feature_image.jpg')
        .reply(200, GIF1x1);

      postModelStub = {
        id: 'inlined-post-id',
        get: sinon.stub().withArgs('feature_image').returns(imageURL),
      };
      const postModelMock = {
        findAll: sinon.stub().returns([postModelStub]),
        edit: sinon.stub().resolves(),
      };
      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-feature-image.jpg')
        .returns('unique-feature-image.jpg');

      const inliner = createInliner({
        PostModel: postModelMock,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon
          .stub()
          .withArgs('.jpg')
          .returns({
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-feature-image.jpg',
            saveRaw: () => '/content/images/unique-feature-image.jpg',
          }),
      });

      await inliner.inline(['https://img.stockfresh.com']);

      assert.ok(requestMock.isDone());
      sinon.assert.calledOnce(postModelMock.edit);
      sinon.assert.calledWith(
        postModelMock.edit,
        {
          feature_image: '__GHOST_URL__/content/images/unique-feature-image.jpg',
        },
        {
          id: 'inlined-post-id',
          context: {
            internal: true,
          },
        },
      );
    });

    it('inlines og_image image in posts_meta table', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/posts_meta_image.jpg';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/posts_meta_image.jpg')
        .reply(200, GIF1x1);

      const getMethodStub = sinon.stub();
      getMethodStub.withArgs('og_image').returns(imageURL);
      getMethodStub.withArgs('twitter_image').returns(null);
      const postsMetaModelInstanceStub = {
        id: 'inlined-post-meta-id',
        get: getMethodStub,
      };

      postMetaModelStub.findPage = sinon.stub().resolves({
        data: [postsMetaModelInstanceStub],
      });
      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-feature-image.jpg')
        .returns('unique-feature-image.jpg');

      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon
          .stub()
          .withArgs('.jpg')
          .returns({
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-posts-meta-image.jpg',
            saveRaw: () => '/content/images/unique-posts-meta-image.jpg',
          }),
      });

      await inliner.inline(['https://img.stockfresh.com']);

      assert.ok(requestMock.isDone());
      sinon.assert.calledOnce(postMetaModelStub.edit);
      assert.deepEqual(postMetaModelStub.edit.args[0][0], {
        og_image: '__GHOST_URL__/content/images/unique-posts-meta-image.jpg',
      });
      assert.deepEqual(postMetaModelStub.edit.args[0][1], {
        id: 'inlined-post-meta-id',
        context: {
          internal: true,
        },
      });
    });

    it('inlines twitter_image image in tags table', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/tag_twitter_image.jpg';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/tag_twitter_image.jpg')
        .reply(200, GIF1x1);

      const getMethodStub = sinon.stub();
      getMethodStub.withArgs('twitter_image').returns(imageURL);
      getMethodStub.returns(null);
      const tagModelInstanceStub = {
        id: 'inlined-tag-id',
        get: getMethodStub,
      };

      tagModelStub.findPage = sinon.stub().resolves({
        data: [tagModelInstanceStub],
      });
      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-tag-twitter-image.jpg')
        .returns('unique-tag-twitter-image.jpg');

      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon
          .stub()
          .withArgs('.jpg')
          .returns({
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-tag-twitter-image.jpg',
            saveRaw: () => '/content/images/unique-tag-twitter-image.jpg',
          }),
      });

      await inliner.inline(['https://img.stockfresh.com']);

      assert.ok(requestMock.isDone());
      sinon.assert.calledOnce(tagModelStub.edit);
      assert.deepEqual(tagModelStub.edit.args[0][0], {
        twitter_image: '__GHOST_URL__/content/images/unique-tag-twitter-image.jpg',
      });
      assert.deepEqual(tagModelStub.edit.args[0][1], {
        id: 'inlined-tag-id',
        context: {
          internal: true,
        },
      });
    });

    it('inlines cover_image image in users table', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/user_cover_image.jpg';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/user_cover_image.jpg')
        .reply(200, GIF1x1);

      const getMethodStub = sinon.stub();
      getMethodStub.withArgs('cover_image').returns(imageURL);
      getMethodStub.returns(null);
      const userModelInstanceStub = {
        id: 'inlined-user-id',
        get: getMethodStub,
      };

      userModelStub.findPage = sinon.stub().resolves({
        data: [userModelInstanceStub],
      });
      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/user-cover-image.jpg')
        .returns('user-cover-image.jpg');

      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon
          .stub()
          .withArgs('.jpg')
          .returns({
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/user-cover-image.jpg',
            saveRaw: () => '/content/images/user-cover-image.jpg',
          }),
      });

      await inliner.inline(['https://img.stockfresh.com']);

      assert.ok(requestMock.isDone());
      sinon.assert.calledOnce(userModelStub.edit);
      assert.deepEqual(userModelStub.edit.args[0][0], {
        cover_image: '__GHOST_URL__/content/images/user-cover-image.jpg',
      });
      assert.deepEqual(userModelStub.edit.args[0][1], {
        id: 'inlined-user-id',
        context: {
          internal: true,
        },
      });
    });
  });

  describe('File type conversion', function () {
    it('Converts HEIC to JPEG', async function () {
      const imageURL = 'https://example.com/image.heic';
      const requestMock = nock('https://example.com')
        .get(encodeURI('/image.heic'))
        .reply(200, heicFile);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);
      const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

      assert.ok(requestMock.isDone());
      assert.equal(fileData.filename, 'image-heic.jpg');
      assert.equal(fileData.extension, '.jpg');
    });

    it('Converts HEIF to JPEG', async function () {
      const imageURL = 'https://example.com/image.heif';
      const requestMock = nock('https://example.com')
        .get(encodeURI('/image.heif'))
        .reply(200, heifFile);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);
      const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

      assert.ok(requestMock.isDone());
      assert.equal(fileData.filename, 'image-heif.jpg');
      assert.equal(fileData.extension, '.jpg');
    });
  });

  describe('Special URL & file type handling', function () {
    it('Handles URLs with quotes', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/ghost-logo’s-cool.png';
      const requestMock = nock('https://img.stockfresh.com')
        .get(encodeURI('/files/f/ghost-logo’s-cool.png'))
        .reply(200, ghostLogoPng);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);
      const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

      assert.ok(requestMock.isDone());
      assert.equal(fileData.filename, 'ghost-logos-cool.png');
      assert.equal(fileData.extension, '.png');
    });

    it('Handles URLs with spaces', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/ghost logo with spaces.png';
      const requestMock = nock('https://img.stockfresh.com')
        .get(encodeURI('/files/f/ghost logo with spaces.png'))
        .reply(200, ghostLogoPng);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);
      const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

      assert.ok(requestMock.isDone());
      assert.equal(fileData.filename, 'ghost-logo-with-spaces.png');
      assert.equal(fileData.extension, '.png');
    });

    it('Handles URLs with no extension', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/ghost-logo';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/ghost-logo')
        .reply(200, ghostLogoPng);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);
      const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

      assert.ok(requestMock.isDone());
      assert.equal(fileData.filename, 'ghost-logo.png');
      assert.equal(fileData.extension, '.png');
    });

    it('Handles URLs with unicode characters', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/你好.png';
      const requestMock = nock('https://img.stockfresh.com')
        .get(encodeURI('/files/f/你好.png'))
        .reply(200, ghostLogoPng);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);
      const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

      assert.ok(requestMock.isDone());
      assert.equal(fileData.filename, 'ni-hao.png');
      assert.equal(fileData.extension, '.png');
    });

    it('Handles URLs with percent-encoded spaces', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/cover%20image.png';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/cover%20image.png')
        .reply(200, ghostLogoPng);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);

      assert.ok(requestMock.isDone());
      assert.ok(response);
    });

    it('Handles URLs with percent-encoded unicode characters', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/caf%C3%A9.png';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/caf%C3%A9.png')
        .reply(200, ghostLogoPng);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);

      assert.ok(requestMock.isDone());
      assert.ok(response);
    });

    it('Handles URLs with a percent-encoded URL in the path', async function () {
      const imageURL =
        'https://substackcdn.com/image/fetch/w_1456,c_limit/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fcover.png';
      const requestMock = nock('https://substackcdn.com')
        .get(
          '/image/fetch/w_1456,c_limit/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fcover.png',
        )
        .reply(200, ghostLogoPng);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);

      assert.ok(requestMock.isDone());
      assert.ok(response);
    });

    it('Handles URLs with spaces and a literal percent sign', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/ghost logo 100%.png';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/ghost%20logo%20100%25.png')
        .reply(200, ghostLogoPng);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);

      assert.ok(requestMock.isDone());
      assert.ok(response);
    });

    it('Handles URLs with no scheme by fetching over https', async function () {
      const imageURL = '//img.stockfresh.com/files/f/ghost-logo.png';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/ghost-logo.png')
        .reply(200, ghostLogoPng);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);
      const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

      assert.ok(requestMock.isDone());
      assert.equal(fileData.filename, 'ghost-logo.png');
      assert.equal(fileData.extension, '.png');
    });

    it('Handles URLs with query params', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/ghost-logo.png?version=1&size=large';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/ghost-logo.png?version=1&size=large')
        .reply(200, ghostLogoPng);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);
      const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

      assert.ok(requestMock.isDone());
      assert.equal(fileData.filename, 'ghost-logo-version-1-size-large.png');
      assert.equal(fileData.extension, '.png');
    });

    it('Handles URLs with duplicated characters', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/ghost---logo.png';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/ghost---logo.png')
        .reply(200, ghostLogoPng);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);
      const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

      assert.ok(requestMock.isDone());
      assert.equal(fileData.filename, 'ghost---logo.png');
      assert.equal(fileData.extension, '.png');
    });

    it('Handles falling back to `content-type` for type', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/photo.gif?v=1&s=2';
      const requestMock = nock('https://img.stockfresh.com')
        .defaultReplyHeaders({
          'content-type': 'image/gif',
        })
        .get('/files/f/photo.gif?v=1&s=2')
        .reply(200);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);
      const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

      assert.ok(requestMock.isDone());
      assert.equal(fileData.filename, 'photo-v-1-s-2.gif');
      assert.equal(fileData.extension, '.gif');
    });

    it('Handles falling back to file path for type', async function () {
      const imageURL = 'https://img.stockfresh.com/files/f/photo.gif?v=1&s=2';
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/photo.gif?v=1&s=2')
        .reply(200);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);
      const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

      assert.ok(requestMock.isDone());
      assert.equal(fileData.filename, 'photo-v-1-s-2.gif');
      assert.equal(fileData.extension, '.gif');
    });
  });

  describe('https upgrade', function () {
    const httpsURL = (file) => `https://img.stockfresh.com/files/f/${file}`;
    const httpURL = (file) => `http://img.stockfresh.com/files/f/${file}`;

    function connectionError(code, extra = {}) {
      return Object.assign(new Error(code), { code }, extra);
    }

    function httpError(statusCode) {
      return Object.assign(new Error(`Response code ${statusCode}`), {
        response: { statusCode },
      });
    }

    // Answers each URL with the given result: an Error rejects, anything else resolves
    function requestStub(results) {
      return sinon.stub().callsFake(async (url) => {
        if (!(url in results)) {
          throw new Error(`Unexpected request: ${url}`);
        }
        const result = results[url];
        if (result instanceof Error) {
          throw result;
        }
        return result;
      });
    }

    const requestedURLs = (stub) => stub.args.map(([url]) => url);

    it('returns the same candidate shape for every URL', function () {
      const candidates = (url) => ExternalMediaInliner.getRequestCandidates(url);

      assert.deepEqual(candidates('https://img.stockfresh.com:443/a.png'), {
        url: 'https://img.stockfresh.com:443/a.png',
        fallbackURL: null,
        origin: 'img.stockfresh.com',
      });
      assert.deepEqual(candidates('ftp://img.stockfresh.com/a.png'), {
        url: 'ftp://img.stockfresh.com/a.png',
        fallbackURL: null,
        origin: null,
      });
      assert.deepEqual(candidates('http://img.stockfresh.com:80/a.png'), {
        url: 'https://img.stockfresh.com/a.png',
        fallbackURL: 'http://img.stockfresh.com:80/a.png',
        origin: 'img.stockfresh.com',
      });
      assert.deepEqual(candidates('//img.stockfresh.com:8080/a.png'), {
        url: 'https://img.stockfresh.com:8080/a.png',
        fallbackURL: 'http://img.stockfresh.com:8080/a.png',
        origin: 'img.stockfresh.com:8080',
      });
    });

    it('fetches an http URL over https', async function () {
      const imageURL = httpURL('ghost-logo.png');
      const requestMock = nock('https://img.stockfresh.com')
        .get('/files/f/ghost-logo.png')
        .reply(200, ghostLogoPng);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);
      const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

      assert.ok(requestMock.isDone());
      assert.equal(fileData.filename, 'ghost-logo.png');
    });

    it('falls back to http for a scheme-less URL when https is unreachable', async function () {
      const imageURL = '//img.stockfresh.com/files/f/ghost-logo.png';
      const httpsMock = nock('https://img.stockfresh.com')
        .get('/files/f/ghost-logo.png')
        .replyWithError('connection refused');
      const httpMock = nock('http://img.stockfresh.com')
        .get('/files/f/ghost-logo.png')
        .reply(200, ghostLogoPng);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(imageURL);
      const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

      assert.ok(httpsMock.isDone(), 'https should be attempted first');
      assert.ok(httpMock.isDone(), 'http should be used as a fallback');
      assert.equal(fileData.filename, 'ghost-logo.png');
    });

    it('falls back to the http URL when https returns an HTTP error', async function () {
      const httpsMock = nock('https://img.stockfresh.com')
        .get('/files/f/ghost-logo.png')
        .reply(404);
      const httpMock = nock('http://img.stockfresh.com')
        .get('/files/f/ghost-logo.png')
        .reply(200, ghostLogoPng);

      const inliner = createInliner({});
      const response = await inliner.getRemoteMedia(httpURL('ghost-logo.png'));

      assert.ok(httpsMock.isDone(), 'https should be attempted');
      assert.ok(httpMock.isDone(), 'http should be attempted');
      assert.ok(response);
    });

    it('does not fall back for an https URL that returns an HTTP error', async function () {
      const fakeRequest = requestStub({
        [httpsURL('missing.png')]: httpError(404),
      });

      const inliner = createInliner({ request: fakeRequest });
      const response = await inliner.getRemoteMedia(httpsURL('missing.png'));

      assert.equal(response, null);
      assert.deepEqual(requestedURLs(fakeRequest), [httpsURL('missing.png')]);
    });

    it('keeps existing percent escapes in both attempts', async function () {
      const fakeRequest = requestStub({
        [httpsURL('cover%20image.png')]: connectionError('ECONNREFUSED'),
        [httpURL('cover%20image.png')]: { body: ghostLogoPng },
      });

      const inliner = createInliner({ request: fakeRequest });
      await inliner.getRemoteMedia(httpURL('cover%20image.png'));

      assert.deepEqual(requestedURLs(fakeRequest), [
        httpsURL('cover%20image.png'),
        httpURL('cover%20image.png'),
      ]);
    });

    it('drops an explicit :80 from the https attempt but keeps other ports', async function () {
      const fakeRequest = requestStub({
        'https://img.stockfresh.com/a.png': connectionError('ECONNREFUSED'),
        'http://img.stockfresh.com:80/a.png': { body: ghostLogoPng },
        'https://img.stockfresh.com:8080/b.png': { body: ghostLogoPng },
      });

      const inliner = createInliner({ request: fakeRequest });
      await inliner.getRemoteMedia('http://img.stockfresh.com:80/a.png');
      await inliner.getRemoteMedia('http://img.stockfresh.com:8080/b.png');

      assert.deepEqual(requestedURLs(fakeRequest), [
        'https://img.stockfresh.com/a.png',
        'http://img.stockfresh.com:80/a.png',
        'https://img.stockfresh.com:8080/b.png',
      ]);
    });

    it('bounds the https attempt but not the http fallback or https URLs', async function () {
      const fakeRequest = requestStub({
        [httpsURL('a.png')]: connectionError('ECONNREFUSED'),
        [httpURL('a.png')]: { body: ghostLogoPng },
        'https://other.example.com/b.png': { body: ghostLogoPng },
      });

      const inliner = createInliner({ request: fakeRequest });
      await inliner.getRemoteMedia(httpURL('a.png'));
      await inliner.getRemoteMedia('https://other.example.com/b.png');

      const [httpsOptions, httpOptions, plainHttpsOptions] = fakeRequest.args.map(
        ([, options]) => options,
      );
      assert.deepEqual(httpsOptions.timeout, { connect: 3000, secureConnect: 3000 });
      assert.ok(!httpsOptions.retry.errorCodes.includes('ECONNREFUSED'));
      assert.ok(!httpsOptions.retry.errorCodes.includes('ETIMEDOUT'));
      assert.deepEqual(httpOptions, { followRedirect: true, responseType: 'buffer' });
      assert.deepEqual(plainHttpsOptions, { followRedirect: true, responseType: 'buffer' });
    });

    describe('within one import run', function () {
      it('skips https for an origin where it was unreachable', async function () {
        const fakeRequest = requestStub({
          [httpsURL('a.png')]: connectionError('ECONNREFUSED'),
          [httpURL('a.png')]: { body: ghostLogoPng },
          [httpURL('b.png')]: { body: ghostLogoPng },
        });

        const inliner = createInliner({ request: fakeRequest });
        const originSchemes = createOriginSchemes();
        await inliner.getRemoteMedia(httpURL('a.png'), { originSchemes });
        const response = await inliner.getRemoteMedia(httpURL('b.png'), { originSchemes });

        assert.ok(response);
        assert.deepEqual(requestedURLs(fakeRequest), [
          httpsURL('a.png'),
          httpURL('a.png'),
          httpURL('b.png'),
        ]);
      });

      it('does not blame the origin when a redirect target is unreachable', async function () {
        const fakeRequest = requestStub({
          [httpsURL('a.png')]: connectionError('ECONNREFUSED', {
            options: { url: new URL('https://cdn.example.com/a.png') },
          }),
          [httpURL('a.png')]: { body: ghostLogoPng },
          [httpsURL('b.png')]: { body: ghostLogoPng },
        });

        const inliner = createInliner({ request: fakeRequest });
        const originSchemes = createOriginSchemes();
        const first = await inliner.getRemoteMedia(httpURL('a.png'), { originSchemes });
        await inliner.getRemoteMedia(httpURL('b.png'), { originSchemes });

        assert.ok(first, 'the file is still fetched over http');
        assert.deepEqual(requestedURLs(fakeRequest), [
          httpsURL('a.png'),
          httpURL('a.png'),
          httpsURL('b.png'),
        ]);
      });

      it('remembers an unreachable origin when got reports the failing hop', async function () {
        const fakeRequest = requestStub({
          [httpsURL('a.png')]: connectionError('ECONNREFUSED', {
            options: { url: new URL(httpsURL('a.png')) },
          }),
          [httpURL('a.png')]: { body: ghostLogoPng },
        });

        const inliner = createInliner({ request: fakeRequest });
        const originSchemes = createOriginSchemes();
        await inliner.getRemoteMedia(httpURL('a.png'), { originSchemes });

        assert.equal(originSchemes.get('img.stockfresh.com'), 'http');
      });

      it('remembers a connect timeout but not a slow download', async function () {
        const fakeRequest = sinon.stub().callsFake(async (url) => {
          if (url.startsWith('http://')) {
            return { body: ghostLogoPng };
          }
          throw connectionError('ETIMEDOUT', {
            event: url.includes('slow-connect') ? 'connect' : 'request',
          });
        });

        const inliner = createInliner({ request: fakeRequest });
        const originSchemes = createOriginSchemes();
        await inliner.getRemoteMedia('http://slow-connect.example.com/a.png', { originSchemes });
        await inliner.getRemoteMedia('http://slow-download.example.com/a.png', { originSchemes });

        assert.equal(originSchemes.get('slow-connect.example.com'), 'http');
        assert.equal(originSchemes.get('slow-download.example.com'), undefined);
      });

      it('falls back on a certificate error without remembering it', async function () {
        const fakeRequest = requestStub({
          [httpsURL('a.png')]: connectionError('CERT_HAS_EXPIRED'),
          [httpURL('a.png')]: { body: ghostLogoPng },
          [httpsURL('b.png')]: { body: ghostLogoPng },
        });

        const inliner = createInliner({ request: fakeRequest });
        const originSchemes = createOriginSchemes();
        const first = await inliner.getRemoteMedia(httpURL('a.png'), { originSchemes });
        await inliner.getRemoteMedia(httpURL('b.png'), { originSchemes });

        assert.ok(first, 'the file is still fetched over http');
        assert.deepEqual(requestedURLs(fakeRequest), [
          httpsURL('a.png'),
          httpURL('a.png'),
          httpsURL('b.png'),
        ]);
      });

      it('never downgrades an origin once https has answered', async function () {
        const fakeRequest = requestStub({
          [httpsURL('a.png')]: { body: ghostLogoPng },
          [httpsURL('b.png')]: connectionError('ECONNREFUSED'),
          [httpURL('b.png')]: { body: ghostLogoPng },
        });

        const inliner = createInliner({ request: fakeRequest });
        const originSchemes = createOriginSchemes();
        await inliner.getRemoteMedia(httpURL('a.png'), { originSchemes });
        const response = await inliner.getRemoteMedia(httpURL('b.png'), { originSchemes });

        assert.equal(response, null);
        assert.deepEqual(requestedURLs(fakeRequest), [httpsURL('a.png'), httpsURL('b.png')]);
        // The pinned attempt is a normal request, with the usual timeout and retries
        assert.deepEqual(fakeRequest.args[1][1], { followRedirect: true, responseType: 'buffer' });
      });

      it('never downgrades an origin after an https URL from it downloaded', async function () {
        const fakeRequest = requestStub({
          [httpsURL('a.png')]: { body: ghostLogoPng },
          [httpsURL('b.png')]: connectionError('ECONNREFUSED'),
          [httpURL('b.png')]: { body: ghostLogoPng },
        });

        const inliner = createInliner({ request: fakeRequest });
        const originSchemes = createOriginSchemes();
        await inliner.getRemoteMedia(httpsURL('a.png'), { originSchemes });
        const response = await inliner.getRemoteMedia(httpURL('b.png'), { originSchemes });

        assert.equal(response, null);
        assert.deepEqual(requestedURLs(fakeRequest), [httpsURL('a.png'), httpsURL('b.png')]);
      });

      it('never downgrades an origin after an https URL from it answered with an error', async function () {
        const fakeRequest = requestStub({
          [httpsURL('missing.png')]: httpError(404),
          [httpsURL('b.png')]: connectionError('ECONNREFUSED'),
          [httpURL('b.png')]: { body: ghostLogoPng },
        });

        const inliner = createInliner({ request: fakeRequest });
        const originSchemes = createOriginSchemes();
        await inliner.getRemoteMedia(httpsURL('missing.png'), { originSchemes });
        await inliner.getRemoteMedia(httpURL('b.png'), { originSchemes });

        assert.deepEqual(requestedURLs(fakeRequest), [httpsURL('missing.png'), httpsURL('b.png')]);
      });

      it('replaces an unreachable record once an https URL from the origin downloads', async function () {
        const fakeRequest = requestStub({
          [httpsURL('a.png')]: connectionError('ECONNREFUSED'),
          [httpURL('a.png')]: { body: ghostLogoPng },
          [httpsURL('b.png')]: { body: ghostLogoPng },
          [httpsURL('c.png')]: connectionError('ECONNREFUSED'),
        });

        const inliner = createInliner({ request: fakeRequest });
        const originSchemes = createOriginSchemes();
        await inliner.getRemoteMedia(httpURL('a.png'), { originSchemes });
        assert.equal(originSchemes.get('img.stockfresh.com'), 'http');

        await inliner.getRemoteMedia(httpsURL('b.png'), { originSchemes });
        assert.equal(originSchemes.get('img.stockfresh.com'), 'https');

        const response = await inliner.getRemoteMedia(httpURL('c.png'), { originSchemes });
        assert.equal(response, null);
        assert.deepEqual(requestedURLs(fakeRequest).slice(2), [
          httpsURL('b.png'),
          httpsURL('c.png'),
        ]);
      });

      it('records nothing when an https URL fails to connect', async function () {
        const fakeRequest = requestStub({
          [httpsURL('a.png')]: connectionError('ECONNREFUSED'),
        });

        const inliner = createInliner({ request: fakeRequest });
        const originSchemes = createOriginSchemes();
        await inliner.getRemoteMedia(httpsURL('a.png'), { originSchemes });

        assert.equal(originSchemes.size, 0);
      });

      it('counts an HTTP error response as https answering', async function () {
        const fakeRequest = requestStub({
          [httpsURL('missing.png')]: httpError(404),
          [httpURL('missing.png')]: httpError(404),
          [httpsURL('b.png')]: connectionError('ECONNREFUSED'),
        });

        const inliner = createInliner({ request: fakeRequest });
        const originSchemes = createOriginSchemes();
        await inliner.getRemoteMedia(httpURL('missing.png'), { originSchemes });
        await inliner.getRemoteMedia(httpURL('b.png'), { originSchemes });

        assert.equal(originSchemes.get('img.stockfresh.com'), 'https');
        assert.deepEqual(requestedURLs(fakeRequest), [
          httpsURL('missing.png'),
          httpURL('missing.png'),
          httpsURL('b.png'),
        ]);
      });

      it('still falls back on an HTTP error once https has answered', async function () {
        const fakeRequest = requestStub({
          [httpsURL('a.png')]: { body: ghostLogoPng },
          [httpsURL('b.png')]: httpError(403),
          [httpURL('b.png')]: { body: ghostLogoPng },
        });

        const inliner = createInliner({ request: fakeRequest });
        const originSchemes = createOriginSchemes();
        await inliner.getRemoteMedia(httpURL('a.png'), { originSchemes });
        const response = await inliner.getRemoteMedia(httpURL('b.png'), { originSchemes });

        assert.ok(response);
        assert.equal(originSchemes.get('img.stockfresh.com'), 'https');
        assert.deepEqual(requestedURLs(fakeRequest), [
          httpsURL('a.png'),
          httpsURL('b.png'),
          httpURL('b.png'),
        ]);
      });

      it('shares what it learns across posts in inline()', async function () {
        const fakeRequest = requestStub({
          [httpsURL('a.jpg')]: connectionError('ECONNREFUSED'),
          [httpURL('a.jpg')]: { body: GIF1x1, headers: { 'content-type': 'image/gif' } },
          [httpURL('b.jpg')]: { body: GIF1x1, headers: { 'content-type': 'image/gif' } },
        });

        const post = (id, file) => {
          const get = sinon.stub();
          get.withArgs('mobiledoc').returns(null);
          get.withArgs('lexical').returns(`{"src":"${httpURL(file)}"}`);
          return { id, get };
        };
        postModelStub.findAll = sinon.stub().resolves([post('one', 'a.jpg'), post('two', 'b.jpg')]);

        const inliner = createInliner({
          request: fakeRequest,
          PostModel: postModelStub,
          PostMetaModel: postMetaModelStub,
          TagModel: tagModelStub,
          UserModel: userModelStub,
          getMediaStorage: sinon.stub().returns(null),
        });
        await inliner.inline(['http://img.stockfresh.com']);

        assert.deepEqual(requestedURLs(fakeRequest), [
          httpsURL('a.jpg'),
          httpURL('a.jpg'),
          httpURL('b.jpg'),
        ]);
      });

      it('starts each inline() run without what an earlier run learned', async function () {
        const fakeRequest = requestStub({
          [httpsURL('a.jpg')]: connectionError('ECONNREFUSED'),
          [httpURL('a.jpg')]: { body: GIF1x1, headers: { 'content-type': 'image/gif' } },
        });

        const get = sinon.stub();
        get.withArgs('mobiledoc').returns(null);
        get.withArgs('lexical').returns(`{"src":"${httpURL('a.jpg')}"}`);
        postModelStub.findAll = sinon.stub().resolves([{ id: 'one', get }]);

        const inliner = createInliner({
          request: fakeRequest,
          PostModel: postModelStub,
          PostMetaModel: postMetaModelStub,
          TagModel: tagModelStub,
          UserModel: userModelStub,
          getMediaStorage: sinon.stub().returns(null),
        });
        await inliner.inline(['http://img.stockfresh.com']);
        await inliner.inline(['http://img.stockfresh.com']);

        assert.deepEqual(requestedURLs(fakeRequest), [
          httpsURL('a.jpg'),
          httpURL('a.jpg'),
          httpsURL('a.jpg'),
          httpURL('a.jpg'),
        ]);
      });
    });
  });

  describe('storeMediaLocally', function () {
    const imageFixture = (fixture) =>
      fs.readFileSync(path.join(__dirname, '../../../../../utils/fixtures/images', fixture));

    const createStorage = () => ({
      storagePath: '/content/images',
      getTargetDir: () => '/content/images',
      getUniqueFileName: () => '/content/images/image.svg',
      saveRaw: sinon.stub().resolves('/content/images/image.svg'),
    });

    it('passes the file contents when picking the storage', async function () {
      const storage = createStorage();
      const getMediaStorage = sinon.stub().resolves(storage);
      const inliner = createInliner({ getMediaStorage });

      await inliner.storeMediaLocally({
        fileBuffer: GIF1x1,
        filename: 'image.gif',
        extension: '.gif',
      });

      sinon.assert.calledOnceWithExactly(getMediaStorage, '.gif', GIF1x1);
      sinon.assert.calledOnceWithExactly(storage.saveRaw, GIF1x1, 'image.svg');
    });

    it('sanitizes SVGs before storing them', async function () {
      const storage = createStorage();
      const getMediaStorage = sinon.stub().resolves(storage);
      const inliner = createInliner({ getMediaStorage });

      await inliner.storeMediaLocally({
        fileBuffer: imageFixture('svg-with-unsafe-script.svg'),
        filename: 'image.svg',
        extension: '.svg',
      });

      const storedSvg = storage.saveRaw.firstCall.args[0].toString();
      assert.match(storedSvg, /<svg/);
      assert.doesNotMatch(storedSvg, /<script/);
      assert.equal(getMediaStorage.firstCall.args[1], storage.saveRaw.firstCall.args[0]);
    });

    it('does not store SVGs that cannot be sanitized', async function () {
      const getMediaStorage = sinon.stub();
      const inliner = createInliner({ getMediaStorage });

      const result = await inliner.storeMediaLocally({
        fileBuffer: imageFixture('svg-malformed.svg'),
        filename: 'image.svg',
        extension: '.svg',
      });

      assert.equal(result, null);
      sinon.assert.notCalled(getMediaStorage);
      sinon.assert.calledOnce(logging.warn);
    });

    it('does not store files when picking the storage fails', async function () {
      const getMediaStorage = sinon.stub().rejects(new Error('Detection failed'));
      const inliner = createInliner({ getMediaStorage });

      const result = await inliner.storeMediaLocally({
        fileBuffer: GIF1x1,
        filename: 'image.gif',
        extension: '.gif',
      });

      assert.equal(result, null);
      sinon.assert.calledOnce(logging.warn);
      sinon.assert.calledOnce(logging.error);
    });
  });

  describe('Find matches', function () {
    it('Finds with full domain', function () {
      const html =
        '<img src="https://example.com/image.jpg" /><img src="https://anotherexample.com/image.jpg" />';
      const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

      assert.equal(matches.length, 1);
      assert.equal(matches[0], 'https://example.com/image.jpg');
    });

    it('Finds with full domain, http and https', function () {
      const html =
        '<img src="http://example.com/image.jpg" /><img src="https://example.com/another-image.jpg" />';
      const matches = ExternalMediaInliner.findMatches(html, 'https?://example.com');

      assert.equal(matches.length, 2);
      assert.equal(matches[0], 'http://example.com/image.jpg');
      assert.equal(matches[1], 'https://example.com/another-image.jpg');
    });

    it('Finds in with comma in string', function () {
      const html = `<img src="https://example.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F7303a336-fa0e-4377-9378-123456abcdef_640x640.png
" />`;
      const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

      assert.equal(matches.length, 1);
      assert.equal(
        matches[0],
        'https://example.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F7303a336-fa0e-4377-9378-123456abcdef_640x640.png',
      );
    });

    it('Finds when seperatd by a comma', function () {
      const html = `<img srcsct="https://example.com/image/fetch,one.png 1x, https://example.com/image/fetch,two.png 2x,https://example.com/image/fetch,three.png 3x" />`;
      const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

      assert.equal(matches.length, 3);
      assert.equal(matches[0], 'https://example.com/image/fetch,one.png');
      assert.equal(matches[1], 'https://example.com/image/fetch,two.png');
      assert.equal(matches[2], 'https://example.com/image/fetch,three.png');
    });

    it('Finds with parenthesis terminator', function () {
      const html = `(https://example.com/image/one.png)`;
      const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

      assert.equal(matches.length, 1);
      assert.equal(matches[0], 'https://example.com/image/one.png');
    });

    it('Finds with apostrophe terminator', function () {
      const html = `'https://example.com/image/one.png'`;
      const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

      assert.equal(matches.length, 1);
      assert.equal(matches[0], 'https://example.com/image/one.png');
    });

    it('Finds with space terminator', function () {
      const html = ` https://example.com/image/one.png `;
      const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

      assert.equal(matches.length, 1);
      assert.equal(matches[0], 'https://example.com/image/one.png');
    });

    it('Finds with less than terminator', function () {
      const html = ` https://example.com/image/one.png<`;
      const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

      assert.equal(matches.length, 1);
      assert.equal(matches[0], 'https://example.com/image/one.png');
    });

    it('Finds with encoded &quot; terminator', function () {
      const html = '&quot;https://example.com/image/one.png&quot;';
      const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

      assert.equal(matches.length, 1);
      assert.equal(matches[0], 'https://example.com/image/one.png');
    });

    it('Finds end of string terminator', function () {
      const html = 'https://example.com/image/one.png';
      const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

      assert.equal(matches.length, 1);
      assert.equal(matches[0], 'https://example.com/image/one.png');
    });

    it('Finds with wildcard domain patterns', function () {
      const html =
        '<img src="https://cdn.example.com/one.png" /><img src="http://example.com/two.png" /><img src="https://other.com/three.png" />';
      const matches = ExternalMediaInliner.findMatches(
        html,
        'https?://([a-zA-Z0-9-.]+)?example.com',
      );

      assert.deepEqual(matches, ['https://cdn.example.com/one.png', 'http://example.com/two.png']);
    });

    it('Times out domain patterns with catastrophic backtracking', function () {
      const html = `${'a'.repeat(40)}c`;

      assert.throws(() => ExternalMediaInliner.findMatches(html, '(a+)+b', { timeout: 50 }), {
        code: 'MEDIA_INLINER_PATTERN_TIMEOUT',
        errorDetails: { domain: '(a+)+b' },
      });
    });
  });

  describe('Domain pattern timeouts', function () {
    it('keeps other domain replacements and skips a timed out pattern for later posts', async function () {
      const findMatches = ExternalMediaInliner.findMatches;
      const findMatchesStub = sinon
        .stub(ExternalMediaInliner, 'findMatches')
        .callsFake((content, domain) => findMatches(content, domain, { timeout: 50 }));
      const lexical = `{"src":"https://example.com/media.jpg"} ${'a'.repeat(40)}c`;
      postModelStub.findAll.resolves(
        ['first-post-id', 'second-post-id'].map((id) => ({
          id,
          get: (field) => (field === 'lexical' ? lexical : null),
        })),
      );

      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
      });
      sinon.stub(inliner, 'importUrl').resolves({
        status: 'stored',
        storedUrl: '__GHOST_URL__/content/images/media.jpg',
      });

      await inliner.inline(['https://example.com', '(a+)+b']);

      assert.deepEqual(
        findMatchesStub.args.map(([, domain]) => domain),
        ['https://example.com', '(a+)+b', 'https://example.com'],
      );
      sinon.assert.calledOnce(logging.error);
      assert.equal(logging.error.args[0][0].code, 'MEDIA_INLINER_PATTERN_TIMEOUT');

      const expectedLexical = lexical.replace(
        'https://example.com/media.jpg',
        '__GHOST_URL__/content/images/media.jpg',
      );
      sinon.assert.calledTwice(postModelStub.edit);
      assert.deepEqual(postModelStub.edit.args[0][0], { lexical: expectedLexical });
      assert.equal(postModelStub.edit.args[0][1].id, 'first-post-id');
      assert.deepEqual(postModelStub.edit.args[1][0], { lexical: expectedLexical });
      assert.equal(postModelStub.edit.args[1][1].id, 'second-post-id');
    });
  });

  describe('CDN storage adapter', function () {
    const CDN_BASE_URL = 'https://storage.ghost.is/c/6f/a3/site';

    beforeEach(function () {
      configUtils.set('urls:image', CDN_BASE_URL);
      configUtils.set('urls:media', CDN_BASE_URL);
      configUtils.set('urls:files', CDN_BASE_URL);

      urlUtilsHelper.stubUrlUtilsWithCdn(
        {
          assetBaseUrls: {
            image: CDN_BASE_URL,
            media: CDN_BASE_URL,
            files: CDN_BASE_URL,
          },
        },
        sinon,
      );
    });

    afterEach(async function () {
      await configUtils.restore();
    });

    it('inlineContent stores correct __GHOST_URL__ path when saveRaw returns CDN URL', async function () {
      const imageURL = 'https://external.com/files/photo.jpg';
      const cdnUrl = 'https://storage.ghost.is/c/6f/a3/site/content/images/unique-photo.jpg';
      nock('https://external.com').get('/files/photo.jpg').reply(200, GIF1x1);

      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-photo.jpg')
        .returns('unique-photo.jpg');

      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon
          .stub()
          .withArgs('.gif')
          .returns({
            storagePath: '/content/images',
            staticFileURLPrefix: '/content/images',
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-photo.jpg',
            saveRaw: () => cdnUrl,
          }),
      });

      const content = `{"cards":[["image",{"src":"${imageURL}"}]]}`;
      const result = await inliner.inlineContent(content, ['https://external.com']);

      assert.equal(
        result,
        '{"cards":[["image",{"src":"__GHOST_URL__/content/images/unique-photo.jpg"}]]}',
      );
    });

    it('inlineContent stores correct __GHOST_URL__ path when saveRaw returns relative path (local storage)', async function () {
      const imageURL = 'https://external.com/files/photo.jpg';
      nock('https://external.com').get('/files/photo.jpg').reply(200, GIF1x1);

      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-photo.jpg')
        .returns('unique-photo.jpg');

      const inliner = createInliner({
        PostModel: postModelStub,
        PostMetaModel: postMetaModelStub,
        TagModel: tagModelStub,
        UserModel: userModelStub,
        getMediaStorage: sinon
          .stub()
          .withArgs('.gif')
          .returns({
            storagePath: '/content/images',
            staticFileURLPrefix: '/content/images',
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-photo.jpg',
            saveRaw: () => '/content/images/unique-photo.jpg',
          }),
      });

      const content = `{"cards":[["image",{"src":"${imageURL}"}]]}`;
      const result = await inliner.inlineContent(content, ['https://external.com']);

      assert.equal(
        result,
        '{"cards":[["image",{"src":"__GHOST_URL__/content/images/unique-photo.jpg"}]]}',
      );
    });

    it('inlineFields stores correct __GHOST_URL__ path when saveRaw returns CDN URL', async function () {
      const imageURL = 'https://external.com/files/feature.jpg';
      const cdnUrl = 'https://storage.ghost.is/c/6f/a3/site/content/images/unique-feature.jpg';
      nock('https://external.com').get('/files/feature.jpg').reply(200, GIF1x1);

      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-feature.jpg')
        .returns('unique-feature.jpg');

      const inliner = createInliner({
        getMediaStorage: sinon
          .stub()
          .withArgs('.gif')
          .returns({
            storagePath: '/content/images',
            staticFileURLPrefix: '/content/images',
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-feature.jpg',
            saveRaw: () => cdnUrl,
          }),
      });

      const resourceStub = {
        get: sinon.stub().withArgs('feature_image').returns(imageURL),
      };

      const updatedFields = await inliner.inlineFields(
        resourceStub,
        ['feature_image'],
        ['https://external.com'],
      );

      assert.equal(updatedFields.feature_image, '__GHOST_URL__/content/images/unique-feature.jpg');
    });

    it('inlineFields stores correct __GHOST_URL__ path when saveRaw returns relative path (local storage)', async function () {
      const imageURL = 'https://external.com/files/feature.jpg';
      nock('https://external.com').get('/files/feature.jpg').reply(200, GIF1x1);

      sinon
        .stub(path, 'relative')
        .withArgs('/content/images', '/content/images/unique-feature.jpg')
        .returns('unique-feature.jpg');

      const inliner = createInliner({
        getMediaStorage: sinon
          .stub()
          .withArgs('.gif')
          .returns({
            storagePath: '/content/images',
            staticFileURLPrefix: '/content/images',
            getTargetDir: () => '/content/images',
            getUniqueFileName: () => '/content/images/unique-feature.jpg',
            saveRaw: () => '/content/images/unique-feature.jpg',
          }),
      });

      const resourceStub = {
        get: sinon.stub().withArgs('feature_image').returns(imageURL),
      };

      const updatedFields = await inliner.inlineFields(
        resourceStub,
        ['feature_image'],
        ['https://external.com'],
      );

      assert.equal(updatedFields.feature_image, '__GHOST_URL__/content/images/unique-feature.jpg');
    });
  });

  describe('SSRF protection', function () {
    it('getRemoteMedia returns null when URL resolves to a private IP', async function () {
      // Restore any existing stub before creating a new one
      dnsPromises.lookup.restore?.();

      // Stub DNS lookup to return a private IP address
      const dnsStub = sinon.stub(dnsPromises, 'lookup').callsFake(function () {
        return Promise.resolve({ address: '192.168.0.1' });
      });

      try {
        const inliner = createInliner({});
        const result = await inliner.getRemoteMedia('https://malicious-site.com/image.jpg');

        assert.equal(result, null);
        sinon.assert.called(logging.error);
        assert.equal(
          logging.error.args[0][0],
          'Error downloading remote media: https://malicious-site.com/image.jpg',
        );
      } finally {
        dnsStub.restore();
      }
    });
  });
});
