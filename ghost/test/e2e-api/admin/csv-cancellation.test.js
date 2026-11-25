const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sinon = require('sinon');
const { compress } = require('@tryghost/zip');
const {
  agentProvider,
  fixtureManager,
  mockManager,
  resetRateLimits,
} = require('../../utils/e2e-framework');
const contentImport = require('../../../core/server/services/content-import');
const { getInstance: getJobsService } = require('../../../core/server/services/jobs-service');
const adapterManager = require('../../../core/server/services/adapter-manager').default;
const { PostMediaInliner } = require('../../../core/server/services/content-import/import/media');
const models = require('../../../core/server/models');

describe('CSV import cancellation', function () {
  let agent;
  let directory;
  let dispatch;
  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'csv-cancel-api-'));
  });
  beforeEach(async function () {
    await resetRateLimits();
    await agent.loginAsOwner();
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

  async function submit(name, zip = false) {
    const source = path.join(directory, name);
    await fs.mkdir(source);
    let file = path.join(source, 'posts.csv');
    await fs.writeFile(file, `title\n${name} first\n${name} second\n${name} third\n`);
    if (zip) {
      file = path.join(directory, `${name}.zip`);
      await compress(source, file);
    }
    const {
      body: { meta },
    } = await agent.post('posts/upload/').attach('postsfile', file).expectStatus(202);
    return {
      id: meta.import_id,
      cancel: `posts/upload/${meta.import_id}/cancel/`,
      progress: `posts/upload/${meta.import_id}/progress/`,
      job: dispatch.lastCall.args[0],
    };
  }

  it.each([false, true])(
    'stops after a committed post and reports only processed rows (ZIP: %s)',
    async function (zip) {
      const name = zip ? 'Cancel ZIP' : 'Cancel CSV';
      const run = await submit(name, zip);
      const entered = Promise.withResolvers();
      const resume = Promise.withResolvers();
      const observed = Promise.withResolvers();
      const storage = adapterManager.getAdapter('storage:imports');
      const read = storage.readStream;
      sinon.stub(storage, 'readStream').callsFake(async function (options) {
        const stream = await read.call(this, options);
        if (options.path.endsWith(`cancel-import-${run.id}`)) {
          observed.resolve();
        }
        return stream;
      });
      const inline = PostMediaInliner.prototype.inline;
      let rows = 0;
      sinon.stub(PostMediaInliner.prototype, 'inline').callsFake(async function (data) {
        rows += 1;
        if (rows === 2) {
          entered.resolve();
          await resume.promise;
        }
        return inline.call(this, data);
      });
      const handling = contentImport.handleJob(run.job);
      try {
        await entered.promise;
        const response = await agent.post(run.cancel).expectStatus(202);
        assert.deepEqual(response.body, { meta: { import_id: run.id, status: 'cancelling' } });
        assert.equal(response.headers['cache-control'], 'private, no-store');
        assert.equal(response.headers['x-cache-invalidate'], undefined);
        await agent.post(run.cancel).expectStatus(202);
        await observed.promise;
      } finally {
        resume.resolve();
        await handling;
      }
      const progress = await agent.get(run.progress).expectStatus(200);
      assert.deepEqual(progress.body.meta, {
        import_id: run.id,
        status: 'cancelled',
        processed: 1,
        total: null,
      });
      const { data: posts } = await models.Post.findPage({
        filter: `title:~'${name}'`,
        status: 'all',
        limit: 'all',
      });
      assert.equal(posts.length, 1);
      const email = mockManager.assert.sentEmail({ subject: 'Your content import was cancelled' });
      assert.match(email.html, /Created:<\/strong> 1/);
      assert.match(email.html, /Failed:<\/strong> 0/);
      assert.equal(email.attachments.length, 1);
      assert.match(email.attachments[0].content.toString(), new RegExp(`${name} first`));
      assert.doesNotMatch(email.attachments[0].content.toString(), /second|third/);
      const repeated = await agent.post(run.cancel).expectStatus(200);
      assert.equal(repeated.body.meta.status, 'cancelled');
    },
  );

  it('checks ownership, permissions and Labs, and stops a queued integration import', async function () {
    await agent.useSelfServeMigrationAdminAPIKey();
    const run = await submit('Cancel integration');
    await agent.loginAsOwner();
    await agent.post(run.cancel).expectStatus(404);
    await agent.loginAsEditor();
    await agent.post(run.cancel).expectStatus(403);
    agent.resetAuthentication();
    await agent.post(run.cancel).expectStatus(403);
    await agent.useSelfServeMigrationAdminAPIKey();
    await agent.post(run.cancel).expectStatus(202);
    assert.equal((await agent.get(run.progress).expectStatus(200)).body.meta.status, 'cancelling');
    await contentImport.handleJob(run.job);
    const email = mockManager.assert.sentEmail({ subject: 'Your content import was cancelled' });
    assert.match(email.html, /processed 0 rows/);
    assert.equal(email.attachments.length, 0);
    mockManager.mockLabsDisabled('csvContentImporter');
    await agent.post(run.cancel).expectStatus(404);
  });

  it('rejects invalid, missing and completed imports', async function () {
    await agent.post('posts/upload/not-an-id/cancel/').expectStatus(404);
    await agent.post('posts/upload/abcdefabcdefabcdefabcdef/cancel/').expectStatus(404);
    const run = await submit('Finished before stop');
    await contentImport.handleJob(run.job);
    await agent.post(run.cancel).expectStatus(409);
  });
});
