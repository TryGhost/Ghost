import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sinon from 'sinon';
import { JobsService } from '../../../../../core/server/services/jobs-service/jobs-service';
import ExternalMediaInlinerJob from '../../../../../core/server/services/media-inliner/external-media-inliner-job';
import { PostMediaInliner } from '../../../../../core/server/services/content-import/import/media';
import type { PostData } from '../../../../../core/server/services/content-import/import/post-data';
import type { ExternalMediaImportResult } from '../../../../../core/server/services/media-inliner/types';

// Required rather than imported so the stubs land on the module instances the
// root requires at init.
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const config = require('../../../../../core/shared/config');
const registerJobHandlers: typeof import('../../../../../core/server/services/jobs-service/register-job-handlers').default =
  require('../../../../../core/server/services/jobs-service/register-job-handlers').default;

type MediaInliner = {
  inline(domains: string[]): Promise<void>;
  importUrl(sourceUrl: string): Promise<ExternalMediaImportResult>;
  getRemoteMedia(sourceUrl: string): Promise<object | null>;
  extractFileDataFromResponse(
    sourceUrl: string,
    response: object,
  ): Promise<{ filename: string; extension: string }>;
  getMediaStorage(extension: string, fileBuffer: Buffer): Promise<unknown>;
};

type Root = {
  init(): Promise<void>;
  readonly service: MediaInliner;
};

const pngResponse = () => ({
  body: fs.readFileSync(path.join(__dirname, 'test/fixtures/ghost-logo.png')),
  headers: {},
});

describe('Media inliner service root', function () {
  const sandbox = sinon.createSandbox();
  // The unit project shares one module registry, so each test loads a fresh
  // root and restores the original for the files that captured it.
  const modulePaths = [require.resolve('../../../../../core/server/services/media-inliner')];
  let savedModules: Array<NodeJS.Module | undefined>;
  let root: Root;
  let getAdapter: sinon.SinonStub;
  let storages: Record<string, object>;
  let uploads: {
    images: { extensions: string[] };
    media: { extensions: string[] };
    files: { extensions: string[] };
  };

  beforeEach(function () {
    savedModules = modulePaths.map((modulePath) => require.cache[modulePath]);
    for (const modulePath of modulePaths) {
      delete require.cache[modulePath];
    }
    storages = {
      'storage:images': { type: 'images' },
      'storage:media': { type: 'media' },
      'storage:files': { type: 'files' },
    };
    getAdapter = sandbox
      .stub(adapterManager, 'getAdapter')
      .callsFake((name: unknown) => storages[name as string]);
    uploads = {
      images: { extensions: ['.svg'] },
      media: { extensions: ['.mp4'] },
      files: { extensions: ['.pdf'] },
    };
    sandbox
      .stub(config, 'get')
      .callThrough()
      .withArgs('uploads')
      .callsFake(() => uploads);
    root = require('../../../../../core/server/services/media-inliner').default;
  });

  afterEach(function () {
    sandbox.restore();
    modulePaths.forEach((modulePath, index) => {
      delete require.cache[modulePath];
      if (savedModules[index]) {
        require.cache[modulePath] = savedModules[index];
      }
    });
  });

  it('rejects use before init without resolving storage adapters at import', function () {
    sinon.assert.notCalled(getAdapter);
    assert.throws(() => root.service, {
      errorType: 'IncorrectUsageError',
      message: 'Media inliner used before init(). Call init() from boot first.',
    });
  });

  it('publishes one ready inliner once init resolves and returns it synchronously afterwards', async function () {
    assert.equal(await root.init(), undefined);

    const inliner = root.service;
    assert.equal(typeof inliner.inline, 'function');
    assert.equal(typeof inliner.importUrl, 'function');
    assert.equal(root.service, inliner);
    assert.deepEqual(getAdapter.args.map(([name]) => name).sort(), [
      'storage:files',
      'storage:images',
      'storage:media',
    ]);
  });

  it('does not publish after storage resolution fails and allows an explicit retry', async function () {
    const failure = new Error('File storage unavailable');
    getAdapter.withArgs('storage:files').throws(failure);

    await assert.rejects(root.init(), (error) => error === failure);
    assert.throws(() => root.service, { errorType: 'IncorrectUsageError' });

    getAdapter.withArgs('storage:files').returns(storages['storage:files']);
    await root.init();

    assert.equal(
      await root.service.getMediaStorage('.pdf', Buffer.alloc(0)),
      storages['storage:files'],
    );
  });

  it('keeps the published inliner and does not resolve storage again on a later init', async function () {
    await root.init();
    const published = root.service;
    const lookupsAtInit = getAdapter.callCount;
    getAdapter.withArgs('storage:media').throws(new Error('Media storage unavailable'));

    // Whether the second call rejects or shares the first attempt, the inliner
    // handed to consumers must still be the published one.
    await root.init().catch(() => undefined);

    assert.equal(root.service, published);
    assert.equal(getAdapter.callCount, lookupsAtInit);
  });

  it('reads the upload extension policy and the active storage adapter on each storage selection', async function () {
    await root.init();
    const retained = root.service;
    const mediaStorage = storages['storage:media'];
    const imageStorage = storages['storage:images'];
    assert.equal(await retained.getMediaStorage('.mp4', Buffer.alloc(0)), mediaStorage);
    // SVG skips the image content check, so it reaches the image adapter directly.
    assert.equal(await retained.getMediaStorage('.svg', Buffer.alloc(0)), imageStorage);
    assert.equal(await retained.getMediaStorage('.webm', Buffer.alloc(0)), null);

    // The e2e lane boots Ghost repeatedly in one process, so a root that
    // captured the extension lists or the adapters at construction would keep
    // stale policy and save to the previous store.
    uploads = { ...uploads, media: { extensions: ['.webm'] } };
    const replacementMedia = { type: 'replacement media' };
    const replacementImages = { type: 'replacement images' };
    storages['storage:media'] = replacementMedia;
    storages['storage:images'] = replacementImages;

    assert.equal(await retained.getMediaStorage('.mp4', Buffer.alloc(0)), null);
    assert.equal(await retained.getMediaStorage('.webm', Buffer.alloc(0)), replacementMedia);
    assert.equal(await retained.getMediaStorage('.svg', Buffer.alloc(0)), replacementImages);
  });

  it('retains the published inliner on repeated init, so the registered job handler keeps using it', async function () {
    await root.init();
    const first = root.service;
    const jobsService = sinon.createStubInstance(JobsService);
    registerJobHandlers({
      jobsService,
      gifts: { startFetch: sinon.stub().resolves() },
      automations: { startFetch: sinon.stub().resolves() },
      newsletters: { startFetch: sinon.stub().resolves() },
      memberJobs: { cleanTokens: sinon.stub().resolves(0), cleanExpiredComped: sinon.stub() },
      giftService: {} as never,
      mediaInliner: first as never,
      mentionsController: {} as never,
      mentionsSendingService: {} as never,
      membersService: { handleImportJob: sinon.stub().resolves() },
      emailService: {} as never,
      siteImporter: { executeImport: sinon.stub().resolves() },
      tinybirdSync: { sync: sinon.stub().resolves() },
    });
    const registration = jobsService.handle
      .getCalls()
      .find((call) => (call.args[0] as { type?: string }).type === ExternalMediaInlinerJob.type);
    assert.ok(registration, 'boot registers the external media inliner job handler');
    const handler = registration!.args[1] as (job: ExternalMediaInlinerJob) => Promise<void>;

    await root.init();
    assert.equal(root.service, first);

    const inline = sandbox.stub(first, 'inline').resolves();
    await handler(new ExternalMediaInlinerJob({ domains: ['https://cdn.example'] }));

    sinon.assert.calledOnceWithExactly(inline, ['https://cdn.example']);
  });

  it('sniffs and converts downloads through the file type and codec loaders the root supplies', async function () {
    await root.init();

    // No extension in the URL and no Content-Type, so only file-type can name it.
    const sniffed = await root.service.extractFileDataFromResponse('https://cdn.example/logo', {
      body: fs.readFileSync(path.join(__dirname, 'test/fixtures/ghost-logo.png')),
      headers: {},
    });
    const converted = await root.service.extractFileDataFromResponse(
      'https://cdn.example/image.heic',
      {
        body: fs.readFileSync(path.join(__dirname, 'test/fixtures/image.heic')),
        headers: {},
      },
    );

    assert.equal(sniffed.extension, '.png');
    assert.equal(converted.extension, '.jpg');
    assert.equal(converted.filename, 'image-heic.jpg');
  });

  it('lets each import run cache downloads over its own captured inliner rather than sharing a root-wide cache', async function () {
    uploads.images.extensions = ['.png'];
    storages['storage:images'] = {
      storagePath: '/content/images',
      getTargetDir: () => '/content/images',
      getUniqueFileName: async () => '/content/images/local.jpg',
      saveRaw: async () => '/content/images/local.jpg',
    };
    await root.init();
    const first = root.service;
    const firstImport = sandbox.stub(first, 'getRemoteMedia').callsFake(async () => pngResponse());
    const sourceUrl = 'https://cdn.example/photo.png';
    const run = () => new PostMediaInliner({ media: root.service, isLocalMediaUrl: () => false });
    const post = (): PostData =>
      ({
        title: 'Imported',
        feature_image: sourceUrl,
        posts_meta: { og_image: sourceUrl },
      }) as PostData;

    const firstRun = run();
    const firstPost = post();
    await firstRun.inline(firstPost);
    assert.equal(firstPost.feature_image, '__GHOST_URL__/content/images/local.jpg');
    assert.equal(firstPost.posts_meta?.og_image, '__GHOST_URL__/content/images/local.jpg');
    sinon.assert.calledOnceWithExactly(firstImport, sourceUrl);

    await root.init();

    // The run keeps its own cache after a re-init, and that cache does not
    // carry over to the next run: the same URL downloads again.
    await firstRun.inline(post());
    sinon.assert.calledOnce(firstImport);

    await run().inline(post());
    sinon.assert.calledTwice(firstImport);
    assert.deepEqual(firstImport.args, [[sourceUrl], [sourceUrl]]);
  });
});
