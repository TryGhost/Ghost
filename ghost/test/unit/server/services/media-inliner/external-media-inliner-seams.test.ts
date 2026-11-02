import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sinon from 'sinon';
import errors from '@tryghost/errors';
import type { ExternalMediaImportResult } from '../../../../../core/server/services/media-inliner/types';
import { createLoggingFake } from '../../../../utils/logging-utils';

const request = require('../../../../../core/server/lib/request-external');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const ExternalMediaInliner = require('../../../../../core/server/services/media-inliner/external-media-inliner');

type Inliner = {
  importUrl(sourceUrl: string): Promise<ExternalMediaImportResult>;
  inline(domains: string[]): Promise<void>;
  inlineContent(content: string, domains: string[]): Promise<string>;
  inlineFields(
    resource: { get(field: string): string | null },
    fields: string[],
    domains: string[],
  ): Promise<Record<string, string>>;
  inlineSimpleFields(
    resources: object[],
    model: object,
    fields: string[],
    domains: string[],
  ): Promise<void>;
  getRemoteMedia(sourceUrl: string): Promise<object | null>;
  extractFileDataFromResponse(
    sourceUrl: string,
    response: object,
  ): Promise<{ fileBuffer: Buffer; filename: string; extension: string }>;
};

const STORED_URL = '__GHOST_URL__/content/images/local.jpg';
const stored = (sourceUrl: string): ExternalMediaImportResult => ({
  status: 'stored',
  sourceUrl,
  storedUrl: STORED_URL,
});

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, 'test/fixtures', name));

function fakeStorage() {
  return {
    storagePath: '/content/images',
    getTargetDir: () => '/content/images',
    getUniqueFileName: async () => '/content/images/local.jpg',
    saveRaw: sinon.stub().resolves('/content/images/local.jpg'),
  };
}

const pngResponse = () => ({ body: fixture('ghost-logo.png'), headers: {} });

function resource(id: string, fields: Record<string, string | null>) {
  return { id, get: (field: string) => fields[field] ?? null };
}

function pageModel(resources: object[]) {
  return {
    findPage: sinon.stub().resolves({ data: resources }),
    edit: sinon.stub().resolves(),
  };
}

describe('ExternalMediaInliner seams', function () {
  let logging: ReturnType<typeof createLoggingFake>;

  // The root supplies these collaborators in production; the tests keep the
  // real ones and replace a loader only where a case needs it.
  function create(deps: object = {}): Inliner {
    return new ExternalMediaInliner({
      logging,
      request,
      urlUtils,
      loadFileType: () => import('file-type'),
      loadHeicConvert: () => require('heic-convert'),
      ...deps,
    });
  }

  function models() {
    return {
      PostModel: { findAll: sinon.stub().resolves([]), edit: sinon.stub().resolves() },
      PostMetaModel: pageModel([]),
      TagModel: pageModel([]),
      UserModel: pageModel([]),
    };
  }

  beforeEach(function () {
    logging = createLoggingFake();
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('matching', function () {
    const domain = 'https?://i[0-9]{1}.wp.com';
    const src = 'http://i2.wp.com/photo.jpg';

    it('matches post bodies against the domain as a pattern but simple fields literally', async function () {
      const inliner = create();
      const importUrl = sinon.stub(inliner, 'importUrl').callsFake(async (url) => stored(url));

      const content = await inliner.inlineContent(`{"src":"${src}"}`, [domain]);

      assert.equal(content, `{"src":"${STORED_URL}"}`);
      sinon.assert.calledOnceWithExactly(importUrl, src);

      importUrl.resetHistory();
      const post = resource('post', { feature_image: src });

      assert.deepEqual(await inliner.inlineFields(post, ['feature_image'], [domain]), {});
      sinon.assert.notCalled(importUrl);

      assert.deepEqual(await inliner.inlineFields(post, ['feature_image'], ['http://i2.wp.com']), {
        feature_image: STORED_URL,
      });
      sinon.assert.calledOnceWithExactly(importUrl, src);
    });

    it('downloads every occurrence of a URL in a body independently', async function () {
      const storage = fakeStorage();
      const inliner = create({ getMediaStorage: sinon.stub().resolves(storage) });
      const getRemoteMedia = sinon
        .stub(inliner, 'getRemoteMedia')
        .callsFake(async () => pngResponse());
      const content = `{"cards":[["image",{"src":"${src}"}],["image",{"src":"${src}"}]]}`;

      const inlined = await inliner.inlineContent(content, ['http://i2.wp.com']);

      // Per-import caching belongs to the content importer's PostMediaInliner,
      // which wraps this class; the inliner itself keeps no cache.
      sinon.assert.calledTwice(getRemoteMedia);
      assert.deepEqual(getRemoteMedia.args, [[src], [src]]);
      sinon.assert.calledTwice(storage.saveRaw);
      assert.equal(
        inlined,
        `{"cards":[["image",{"src":"${STORED_URL}"}],["image",{"src":"${STORED_URL}"}]]}`,
      );
    });
  });

  describe('per-resource continuation', function () {
    const domain = 'https://cdn.example';
    const first = `${domain}/first.jpg`;
    const second = `${domain}/second.jpg`;

    it('continues with the remaining posts when writing one post fails', async function () {
      const deps = models();
      const failure = new Error('Could not save the post');
      deps.PostModel.findAll.resolves([
        resource('post-1', { lexical: `{"src":"${first}"}` }),
        resource('post-2', { lexical: `{"src":"${second}"}` }),
      ]);
      deps.PostModel.edit.onFirstCall().rejects(failure);
      const inliner = create(deps);
      sinon.stub(inliner, 'importUrl').callsFake(async (url) => stored(url));

      await inliner.inline([domain]);

      sinon.assert.calledTwice(deps.PostModel.edit);
      assert.equal(deps.PostModel.edit.firstCall.args[1].id, 'post-1');
      assert.equal(deps.PostModel.edit.secondCall.args[1].id, 'post-2');
      assert.deepEqual(deps.PostModel.edit.secondCall.args[0], {
        lexical: `{"src":"${STORED_URL}"}`,
      });
      sinon.assert.calledWithExactly(logging.error, 'Error inlining media for post: post-1');
      assert.ok(logging.error.secondCall.args[0] instanceof errors.DataImportError);
    });

    it('leaves a post untouched when its download fails and still inlines the next post', async function () {
      const deps = models();
      deps.PostModel.findAll.resolves([
        resource('post-1', { lexical: `{"src":"${first}"}` }),
        resource('post-2', { lexical: `{"src":"${second}"}` }),
      ]);
      const inliner = create({ ...deps, getMediaStorage: sinon.stub().resolves(fakeStorage()) });
      // A download that produces no response is logged by getRemoteMedia and
      // becomes an expected failure, not an error for the whole post.
      sinon
        .stub(inliner, 'getRemoteMedia')
        .callsFake(async (url) => (url === first ? null : pngResponse()));

      await inliner.inline([domain]);

      sinon.assert.calledOnce(deps.PostModel.edit);
      assert.deepEqual(deps.PostModel.edit.firstCall.args, [
        { lexical: `{"src":"${STORED_URL}"}` },
        { id: 'post-2', context: { internal: true } },
      ]);
      sinon.assert.neverCalledWith(logging.error, 'Error inlining media for post: post-1');
    });

    it('continues with the remaining resources when writing one simple-field resource fails', async function () {
      const deps = models();
      deps.TagModel = pageModel([
        resource('tag-1', { feature_image: first }),
        resource('tag-2', { feature_image: second }),
      ]);
      deps.TagModel.edit.onFirstCall().rejects(new Error('Could not save the tag'));
      const inliner = create(deps);
      sinon.stub(inliner, 'importUrl').callsFake(async (url) => stored(url));

      await inliner.inline([domain]);

      sinon.assert.calledTwice(deps.TagModel.edit);
      assert.deepEqual(deps.TagModel.edit.secondCall.args, [
        { feature_image: STORED_URL },
        { id: 'tag-2', context: { internal: true } },
      ]);
      sinon.assert.calledWithExactly(logging.error, 'Error inlining media for: tag-1');
    });

    it('rejects when the post query fails, before any write', async function () {
      const deps = models();
      const failure = new Error('Posts unavailable');
      deps.PostModel.findAll.rejects(failure);
      const inliner = create(deps);
      const importUrl = sinon.stub(inliner, 'importUrl');

      await assert.rejects(inliner.inline([domain]), (error) => error === failure);

      sinon.assert.notCalled(importUrl);
      sinon.assert.notCalled(deps.PostModel.edit);
      sinon.assert.notCalled(deps.TagModel.findPage);
    });

    it('rejects when a later query fails and keeps the writes already made', async function () {
      const deps = models();
      const failure = new Error('Tags unavailable');
      deps.PostModel.findAll.resolves([resource('post-1', { lexical: `{"src":"${first}"}` })]);
      deps.TagModel.findPage.rejects(failure);
      const inliner = create(deps);
      sinon.stub(inliner, 'importUrl').callsFake(async (url) => stored(url));

      await assert.rejects(inliner.inline([domain]), (error) => error === failure);

      sinon.assert.calledOnce(deps.PostModel.edit);
      sinon.assert.calledOnce(deps.PostMetaModel.findPage);
      sinon.assert.notCalled(deps.UserModel.findPage);
    });
  });

  describe('lazy codecs', function () {
    const heicUrl = 'https://cdn.example/image.heic';

    function harness(body: Buffer, deps: object = {}) {
      const storage = fakeStorage();
      const getMediaStorage = sinon.stub().resolves(storage);
      const inliner = create({ getMediaStorage, ...deps });
      sinon.stub(inliner, 'getRemoteMedia').resolves({ body, headers: {} });
      return { inliner, getMediaStorage, storage };
    }

    it('prefers the sniffed file type over the response headers and URL', async function () {
      const { inliner } = harness(fixture('ghost-logo.png'));

      const media = await inliner.extractFileDataFromResponse('https://cdn.example/photo.gif', {
        body: fixture('ghost-logo.png'),
        headers: { 'content-type': 'image/gif' },
      });

      assert.equal(media.extension, '.png');
      assert.equal(media.filename, 'photo-gif.png');
    });

    it('does not load the HEIC codec when the inliner module is loaded', function () {
      // The module under test is required at the top of this file, so load a fresh
      // copy under a CommonJS loader interceptor to observe its imports.
      const Module = require('node:module') as {
        _load: (request: string, ...rest: unknown[]) => unknown;
      };
      const originalLoad = Module._load;
      let heicLoads = 0;
      Module._load = function (moduleName: string, ...rest: unknown[]) {
        if (moduleName === 'heic-convert') {
          heicLoads += 1;
        }
        return originalLoad.call(this, moduleName, ...rest);
      };
      const inlinerPath =
        require.resolve('../../../../../core/server/services/media-inliner/external-media-inliner');
      const cached = require.cache[inlinerPath];
      delete require.cache[inlinerPath];
      try {
        require(inlinerPath);
        assert.equal(heicLoads, 0);
      } finally {
        Module._load = originalLoad;
        require.cache[inlinerPath] = cached;
      }
    });

    it('falls back to the response headers when file-type cannot be loaded, and tries again next time', async function () {
      const failure = new Error('file-type unavailable');
      const loadFileType = sinon
        .stub()
        .callsFake(() => import('file-type'))
        .onFirstCall()
        .rejects(failure);
      const { inliner } = harness(fixture('ghost-logo.png'), { loadFileType });
      const response = {
        body: fixture('ghost-logo.png'),
        headers: { 'content-type': 'image/gif' },
      };

      const fallback = await inliner.extractFileDataFromResponse(
        'https://cdn.example/photo.gif',
        response,
      );
      const sniffed = await inliner.extractFileDataFromResponse(
        'https://cdn.example/photo.gif',
        response,
      );

      assert.equal(fallback.extension, '.gif');
      assert.equal(sniffed.extension, '.png');
      sinon.assert.calledTwice(loadFileType);
    });

    it('loads the HEIC codec when a HEIC file is converted, not before', async function () {
      const loadHeicConvert = sinon.spy(() => require('heic-convert'));
      const png = harness(fixture('ghost-logo.png'), { loadHeicConvert });

      sinon.assert.notCalled(loadHeicConvert);
      const pngResult = await png.inliner.importUrl('https://cdn.example/logo.png');
      assert.equal(pngResult.status, 'stored');
      sinon.assert.notCalled(loadHeicConvert);

      const heic = harness(fixture('image.heic'), { loadHeicConvert });
      const result = await heic.inliner.importUrl(heicUrl);

      assert.equal(result.status, 'stored');
      sinon.assert.calledOnce(loadHeicConvert);
      assert.equal(heic.getMediaStorage.firstCall.args[0], '.jpg');
    });

    it('surfaces a codec that cannot be loaded as an extraction failure rather than storing the original', async function () {
      const failure = new Error("Cannot find module 'heic-convert'");
      const { inliner, getMediaStorage } = harness(fixture('image.heic'), {
        loadHeicConvert: () => {
          throw failure;
        },
      });

      const result = await inliner.importUrl(heicUrl);

      assert.deepEqual(result, {
        status: 'failed',
        sourceUrl: heicUrl,
        stage: 'extract',
        reason: 'The downloaded media file could not be read.',
        error: failure,
      });
      sinon.assert.notCalled(getMediaStorage);
      sinon.assert.neverCalledWith(logging.error, `Error converting file to JPEG: ${heicUrl}`);
    });

    it('keeps the original HEIC bytes and extension when conversion itself fails', async function () {
      const failure = new Error('Unsupported HEIC variant');
      const heicFile = fixture('image.heic');
      const { inliner, getMediaStorage, storage } = harness(heicFile, {
        loadHeicConvert: () => async () => {
          throw failure;
        },
      });

      const result = await inliner.importUrl(heicUrl);

      assert.equal(result.status, 'stored');
      sinon.assert.calledOnceWithExactly(getMediaStorage, '.heic', heicFile);
      assert.equal(storage.saveRaw.firstCall.args[0], heicFile);
      sinon.assert.calledWithExactly(logging.error, `Error converting file to JPEG: ${heicUrl}`);
      assert.ok(logging.error.secondCall.args[0] instanceof errors.DataImportError);
    });
  });
});
