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
  getMediaStorage(extension: string, fileBuffer: Buffer): Promise<unknown>;
};

type Root = {
  init(): Promise<void>;
  getInstance(): MediaInliner;
};

const pngResponse = () => ({
  body: fs.readFileSync(path.join(__dirname, 'test/fixtures/ghost-logo.png')),
  headers: {},
});

describe('Media inliner service root', function () {
  const sandbox = sinon.createSandbox();
  // The unit project shares one module registry, so each test loads a fresh
  // root and restores the original for the files that captured it.
  const modulePaths = ['media-inliner', 'media-inliner/service'].map((name) =>
    require.resolve(`../../../../../core/server/services/${name}`),
  );
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
    root = require('../../../../../core/server/services/media-inliner');
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
    assert.throws(() => root.getInstance(), {
      errorType: 'IncorrectUsageError',
      message: 'Media inliner used before init(). Call init() from boot first.',
    });
  });

  it('publishes one ready inliner once init resolves and returns it synchronously afterwards', async function () {
    assert.equal(await root.init(), undefined);

    const inliner = root.getInstance();
    assert.equal(typeof inliner.inline, 'function');
    assert.equal(typeof inliner.importUrl, 'function');
    assert.equal(root.getInstance(), inliner);
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
    assert.throws(() => root.getInstance(), { errorType: 'IncorrectUsageError' });

    getAdapter.withArgs('storage:files').returns(storages['storage:files']);
    await root.init();

    assert.equal(
      await root.getInstance().getMediaStorage('.pdf', Buffer.alloc(0)),
      storages['storage:files'],
    );
  });

  it('keeps the published inliner when a later init cannot resolve storage', async function () {
    await root.init();
    const published = root.getInstance();
    getAdapter.withArgs('storage:media').throws(new Error('Media storage unavailable'));

    // Whether the second call rejects or shares the first attempt, the inliner
    // handed to consumers must still be the published one.
    await root.init().catch(() => undefined);

    assert.equal(root.getInstance(), published);
    assert.equal(
      await published.getMediaStorage('.mp4', Buffer.alloc(0)),
      storages['storage:media'],
    );
  });

  it('reads the upload extension policy on each storage selection while retaining the adapters resolved at init', async function () {
    await root.init();
    const retained = root.getInstance();
    const mediaStorage = storages['storage:media'];
    assert.equal(await retained.getMediaStorage('.mp4', Buffer.alloc(0)), mediaStorage);
    assert.equal(await retained.getMediaStorage('.webm', Buffer.alloc(0)), null);

    // The e2e lane boots Ghost repeatedly in one process, so a root that
    // captured the extension lists at construction would keep stale policy.
    uploads = { ...uploads, media: { extensions: ['.webm'] } };
    storages['storage:media'] = { type: 'replacement' };

    assert.equal(await retained.getMediaStorage('.mp4', Buffer.alloc(0)), null);
    assert.equal(await retained.getMediaStorage('.webm', Buffer.alloc(0)), mediaStorage);
    sinon.assert.calledThrice(getAdapter);
  });

  it('replaces the published inliner on repeated init while a registered job handler keeps the first', async function () {
    await root.init();
    const first = root.getInstance();
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
    const second = root.getInstance();
    // Incidental today: every init constructs a new inliner rather than
    // retaining the first. Nothing in production asks for a replacement.
    assert.notEqual(second, first);

    const firstInline = sandbox.stub(first, 'inline').resolves();
    const secondInline = sandbox.stub(second, 'inline').resolves();
    await handler(new ExternalMediaInlinerJob({ domains: ['https://cdn.example'] }));

    sinon.assert.calledOnceWithExactly(firstInline, ['https://cdn.example']);
    sinon.assert.notCalled(secondInline);
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
    const first = root.getInstance();
    const firstImport = sandbox.stub(first, 'getRemoteMedia').callsFake(async () => pngResponse());
    const sourceUrl = 'https://cdn.example/photo.png';
    const run = () =>
      new PostMediaInliner({ media: root.getInstance(), isLocalMediaUrl: () => false });
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
    const second = root.getInstance();
    const secondImport = sandbox
      .stub(second, 'getRemoteMedia')
      .callsFake(async () => pngResponse());

    // The run that captured the first inliner keeps using it after a re-init,
    // and its cache does not carry over to the next run.
    await firstRun.inline(post());
    sinon.assert.calledOnce(firstImport);
    sinon.assert.notCalled(secondImport);

    await run().inline(post());
    sinon.assert.calledOnce(firstImport);
    sinon.assert.calledOnceWithExactly(secondImport, sourceUrl);
  });
});
