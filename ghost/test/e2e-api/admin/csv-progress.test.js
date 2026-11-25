const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sinon = require('sinon');
const FormData = require('form-data');
const { compress } = require('@tryghost/zip');
const contentImportService = require('../../../core/server/services/content-import');
const { getInstance: getJobsService } = require('../../../core/server/services/jobs-service');
const { PostMediaInliner } = require('../../../core/server/services/content-import/import/media');
const {
  agentProvider,
  fixtureManager,
  mockManager,
  resetRateLimits,
} = require('../../utils/e2e-framework');

describe('CSV import progress', function () {
  let agent;
  let directory;
  let dispatch;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'csv-progress-test-'));
  });

  beforeEach(async function () {
    await resetRateLimits();
    mockManager.mockMail();
    dispatch = sinon.stub(getJobsService(), 'dispatch').resolves();
  });

  afterEach(function () {
    sinon.restore();
    mockManager.restore();
  });

  afterAll(async function () {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it.each([false, true])(
    'tracks queued, running and completed imports including skips and failures (ZIP: %s)',
    async function (zip) {
      const source = path.join(directory, zip ? 'archive' : 'raw');
      await fs.mkdir(source);
      const file = path.join(source, 'posts.csv');
      const title = zip ? 'ZIP progress' : 'CSV progress';
      await fs.writeFile(
        file,
        `title,featured\n${title},true\n${title},true\nInvalid,falseish\n${title} last,false\n`,
      );
      let upload = file;
      if (zip) {
        upload = path.join(directory, 'posts.zip');
        await compress(source, upload);
      }
      await agent.loginAsOwner();
      const {
        body: { meta: inspection },
      } = await agent.post('posts/upload/inspect/').attach('postsfile', upload).expectStatus(200);
      const url = `posts/upload/${inspection.upload_id}/progress/`;
      await agent.get(url).expectStatus(404); // Inspection alone has not queued an import.
      const form = new FormData();
      form.append('upload_id', inspection.upload_id);
      const {
        body: { meta },
      } = await agent.post('posts/upload/').body(form).expectStatus(202);
      assert.equal(meta.import_id, inspection.upload_id);
      const job = dispatch.firstCall.args[0];
      const entered = Promise.withResolvers();
      const resume = Promise.withResolvers();
      const inline = PostMediaInliner.prototype.inline;
      sinon.stub(PostMediaInliner.prototype, 'inline').callsFake(async function (data) {
        entered.resolve();
        await resume.promise;
        return inline.call(this, data);
      });
      let handling;
      try {
        const queued = await agent.get(url).expectStatus(200);
        assert.deepEqual(queued.body, {
          meta: { import_id: meta.import_id, status: 'queued', processed: 0, total: 4 },
        });
        assert.equal(queued.headers['cache-control'], 'private, no-store');
        assert.equal(queued.headers['x-cache-invalidate'], undefined);
        await agent.loginAsAdmin();
        await agent.get(url).expectStatus(404);
        await agent.loginAsEditor();
        await agent.get(url).expectStatus(403);
        await agent.loginAsOwner();
        handling = contentImportService.handleJob(job);
        await entered.promise;
        const running = await agent.get(url).expectStatus(200);
        assert.deepEqual(running.body.meta, {
          import_id: meta.import_id,
          status: 'running',
          processed: 0,
          total: 4,
        });
      } finally {
        resume.resolve();
        await (handling ?? contentImportService.handleJob(job));
      }
      const completed = await agent.get(url).expectStatus(200);
      assert.deepEqual(completed.body.meta, {
        import_id: meta.import_id,
        status: 'complete',
        processed: 4,
        total: 4,
      });
      const email = mockManager.assert.sentEmail({ subject: 'Your content import is complete' });
      assert.match(email.html, /Created:<\/strong> 2/);
      assert.match(email.html, /Skipped:<\/strong> 1/);
      assert.match(email.html, /Failed:<\/strong> 1/);
      mockManager.mockLabsDisabled('csvContentImporter');
      await agent.get(url).expectStatus(404);
    },
  );

  it.each([false, true])(
    'supports integration-owned direct uploads and terminal failures (failure: %s)',
    async function (failed) {
      await agent.useSelfServeMigrationAdminAPIKey();
      const file = path.join(directory, 'direct.csv');
      await fs.writeFile(file, `title\nDirect progress ${failed}\n`);
      const {
        body: { meta },
      } = await agent.post('posts/upload/').attach('postsfile', file).expectStatus(202);
      const url = `posts/upload/${meta.import_id}/progress/`;
      const job = dispatch.firstCall.args[0];
      try {
        const queued = await agent.get(url).expectStatus(200);
        assert.deepEqual(queued.body.meta, {
          import_id: meta.import_id,
          status: 'queued',
          processed: 0,
          total: null,
        });
        if (failed) {
          sinon
            .stub(PostMediaInliner.prototype, 'inline')
            .rejects(new Error('Unexpected processing failure'));
        }
      } finally {
        await contentImportService.handleJob(job);
      }
      const finished = await agent.get(url).expectStatus(200);
      assert.deepEqual(finished.body.meta, {
        import_id: meta.import_id,
        status: failed ? 'failed' : 'complete',
        processed: failed ? 0 : 1,
        total: failed ? null : 1,
      });
      await agent.loginAsOwner();
      await agent.get(url).expectStatus(404);
    },
  );

  it('rejects unauthenticated requests and invalid or unknown IDs', async function () {
    agent.resetAuthentication();
    const url = 'posts/upload/abcdefabcdefabcdefabcdef/progress/';
    await agent.get(url).expectStatus(403);
    await agent.loginAsOwner();
    await agent.get(url).expectStatus(404);
    await agent.get('posts/upload/not-an-import-id/progress/').expectStatus(404);
  });
});
