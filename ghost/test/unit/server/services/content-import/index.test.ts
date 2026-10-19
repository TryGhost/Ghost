import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';
import type { ExternalMediaImporter } from '../../../../../core/server/services/media-inliner/types';

const rootPath = require.resolve('../../../../../core/server/services/content-import');
const { default: ContentCSVImportJob } =
  require('../../../../../core/server/services/content-import/jobs/content-csv-import-job') as typeof import('../../../../../core/server/services/content-import/jobs/content-csv-import-job');
const { default: ContentCSVImporter } =
  require('../../../../../core/server/services/content-import/import/importer') as typeof import('../../../../../core/server/services/content-import/import/importer');
const { BookshelfPostsRepository } =
  require('../../../../../core/server/services/content-import/import/post-repository') as typeof import('../../../../../core/server/services/content-import/import/post-repository');
const jobsPath = require.resolve('../../../../../core/server/services/jobs-service');
require(jobsPath);
const media = require('../../../../../core/server/services/media-inliner');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const mail = require('../../../../../core/server/lib/mail');
const sentry = require('../../../../../core/shared/sentry');
const urlService = require('../../../../../core/server/services/url');
const config = require('../../../../../core/shared/config');
const settingsCache = require('../../../../../core/shared/settings-cache');
type Root = typeof import('../../../../../core/server/services/content-import');

function job() {
  return new ContentCSVImportJob({
    importId: 'run_test',
    file: { path: '/tmp/staged-import', name: 'posts.csv' },
    importTagNames: ['#Import 2026-01-01 10:30', '#Import Run run_test'],
    emailRecipient: 'owner@example.com',
  });
}

describe('Content import composition root', function () {
  const sandbox = sinon.createSandbox();
  let previousModule: NodeJS.Module | undefined;
  let root: Root;
  let directory: string | undefined;
  let send: sinon.SinonStub;

  beforeEach(function () {
    previousModule = require.cache[rootPath];
    delete require.cache[rootPath];
    root = require(rootPath);
    send = sandbox.stub(mail.GhostMailer.prototype, 'send').resolves();
    sandbox.stub(sentry, 'captureException');
  });

  afterEach(async function () {
    sandbox.restore();
    delete require.cache[rootPath];
    if (previousModule) {
      require.cache[rootPath] = previousModule;
    }
    if (directory) {
      await fs.rm(directory, { recursive: true, force: true });
      directory = undefined;
    }
  });

  it('rejects both entry points before init and makes allSettled a harmless no-op', async function () {
    assert.throws(
      () => root.importCSV({ filePath: '/tmp/upload', fileName: 'posts.csv' }),
      /Content import service used before init/,
    );
    assert.throws(() => root.handleJob(job()), /Content import service used before init/);
    await root.allSettled();
    sinon.assert.notCalled(send);
  });

  it('validates requests before forwarding and retains the same importer for requests, jobs and draining', async function () {
    const accepted = Promise.resolve({ importId: 'run_test', total: 1 });
    const imported = sandbox.stub(ContentCSVImporter.prototype, 'importCSV').returns(accepted);
    const handled = sandbox.stub(ContentCSVImporter.prototype, 'handle').resolves();
    const drained = sandbox.stub(ContentCSVImporter.prototype, 'allSettled').resolves();
    root.init();
    assert.throws(() => root.importCSV({ filePath: '', fileName: 'posts.csv' }), {
      errorType: 'ValidationError',
    });
    sinon.assert.notCalled(imported);
    const request = {
      filePath: '/tmp/upload',
      fileName: 'posts.csv',
      mapping: { Heading: 'title' },
      requestUserEmail: 'owner@example.com',
    };
    assert.equal(root.importCSV(request), accepted);
    await accepted;
    const importer = imported.firstCall.thisValue;
    root.init();
    const delivered = job();
    assert.equal(root.handleJob(delivered), handled.firstCall.returnValue);
    assert.equal(root.allSettled(), drained.firstCall.returnValue);
    await root.allSettled();
    sinon.assert.calledOnceWithExactly(imported, request);
    sinon.assert.calledOnceWithExactly(handled, delivered);
    assert.equal(handled.firstCall.thisValue, importer);
    assert.equal(drained.firstCall.thisValue, importer);
    sinon.assert.notCalled(send);
  });

  it('does not publish after construction fails and can initialize on the next attempt', async function () {
    const failure = new Error('Mail composition unavailable');
    const GhostMailer = mail.GhostMailer;
    sandbox
      .stub(mail, 'GhostMailer')
      .callsFake(() => new GhostMailer())
      .onFirstCall()
      .throws(failure);
    assert.throws(
      () => root.init(),
      (error) => error === failure,
    );
    assert.throws(() => root.handleJob(job()), /Content import service used before init/);
    await root.allSettled();
    root.init();
    const handled = sandbox.stub(ContentCSVImporter.prototype, 'handle').resolves();
    await root.handleJob(job());
    sinon.assert.calledOnce(handled);
  });

  it('looks up jobs, storage and media when work runs, keeping one run alive across repeated init', async function () {
    const getJobs = sandbox.stub().throws(new Error('Jobs not ready'));
    sandbox.replace(require.cache[jobsPath]!, 'exports', { getInstance: getJobs });
    const getMedia = sandbox.stub(media, 'getInstance').throws(new Error('Media not ready'));
    const getAdapter = sandbox
      .stub(adapterManager, 'getAdapter')
      .throws(new Error('Storage not ready'));
    delete require.cache[rootPath];
    root = require(rootPath);
    root.init();
    sinon.assert.notCalled(getJobs);
    sinon.assert.notCalled(getMedia);
    sinon.assert.notCalled(getAdapter);

    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'content-root-'));
    const filePath = path.join(directory, 'posts.csv');
    await fs.writeFile(
      filePath,
      'title,feature_image\nImported post,https://images.example/post.png\n',
    );
    const storage = {
      storagePath: directory,
      save: sandbox.stub().resolves('/imports/posts.csv'),
      urlToPath: () => 'posts.csv',
      delete: sandbox.stub().resolves(),
    };
    getAdapter.withArgs('storage:imports').returns(storage);
    const dispatched = Promise.withResolvers<void>();
    const dispatchStarted = Promise.withResolvers<void>();
    const dispatch = sandbox.stub().callsFake(() => {
      dispatchStarted.resolve();
      return dispatched.promise;
    });
    getJobs.returns({ dispatch });
    const importUrl = sandbox.stub().callsFake(async (sourceUrl: string) => ({
      status: 'stored' as const,
      sourceUrl,
      storedUrl: '/content/images/local.png',
    }));
    const inliner: ExternalMediaImporter = { importUrl };
    getMedia.returns(inliner);
    sandbox.stub(settingsCache, 'get').withArgs('timezone').returns('Etc/UTC');
    sandbox.stub(config, 'getSiteUrl').returns('https://publication.example/');
    sandbox.stub(config, 'getSubdir').returns('');
    const write = sandbox.stub(BookshelfPostsRepository.prototype, 'write').resolves({
      status: 'created',
      post: { id: 'post-id', toJSON: () => ({ id: 'post-id', slug: 'imported-post' }) },
      warnings: [],
    });
    sandbox
      .stub(urlService, 'getUrlForResource')
      .returns('https://publication.example/imported-post/');

    let acceptedFinished = false;
    const acceptance = root
      .importCSV({
        filePath,
        fileName: 'posts.csv',
        requestUserEmail: 'owner@example.com',
      })
      .then((result) => {
        acceptedFinished = true;
        return result;
      });
    try {
      await Promise.race([dispatchStarted.promise, acceptance]);
      assert.equal(acceptedFinished, false);
      sinon.assert.notCalled(getMedia);
    } finally {
      dispatched.resolve();
      await Promise.allSettled([acceptance]);
    }
    const accepted = await acceptance;
    assert.equal(accepted.total, 1);
    sinon.assert.calledOnce(dispatch);
    sinon.assert.notCalled(getMedia);
    const delivered = dispatch.firstCall.args[0];
    assert.ok(delivered instanceof ContentCSVImportJob);
    assert.equal(delivered.importId, accepted.importId);
    root.init();
    await root.handleJob(delivered);
    await root.allSettled();
    sinon.assert.calledOnceWithExactly(importUrl, 'https://images.example/post.png');
    sinon.assert.calledOnce(write);
    assert.equal(write.firstCall.args[0].feature_image, '/content/images/local.png');
    sinon.assert.calledOnce(send);
    sinon.assert.calledOnce(storage.delete);
  });
});
