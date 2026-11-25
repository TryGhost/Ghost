/* global vi */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const FormData = require('form-data');
const { compress } = require('@tryghost/zip');
const fsExtra = require('fs-extra');
const sinon = require('sinon');
const models = require('../../../core/server/models');
const {
  agentProvider,
  fixtureManager,
  mockManager,
  resetRateLimits,
} = require('../../utils/e2e-framework');

describe('CSV import inspection', function () {
  let agent;
  let directory;
  let file;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'csv-inspection-test-'));
    file = path.join(directory, 'posts.csv');
    await fs.writeFile(
      file,
      'Heading,Other\n' +
        Array.from({ length: 22 }, (_, index) => `Post ${index + 1},sample`).join('\n'),
    );
  });

  beforeEach(async function () {
    await resetRateLimits();
  });

  afterEach(function () {
    mockManager.restore();
  });

  afterAll(async function () {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('returns at most 20 records and only lets the upload owner cancel', async function () {
    await agent.loginAsOwner();
    const {
      body: { meta },
    } = await agent.post('posts/upload/inspect/').attach('postsfile', file).expectStatus(200);
    assert.match(meta.upload_id, /^[a-f0-9]{24}$/);
    assert.deepEqual(meta.columns, ['Heading', 'Other']);
    assert.equal(meta.rows.length, 20);
    assert.deepEqual(meta.rows[19], { Heading: 'Post 20', Other: 'sample' });

    const url = `posts/upload/inspect/${meta.upload_id}/`;
    await agent.loginAsAdmin();
    await agent.delete(url).expectStatus(404);
    await agent.loginAsOwner();
    await agent.delete(url).expectStatus(204);
    await agent.delete(url).expectStatus(404);
  });

  it('clips display values to the preview budget without splitting a UTF-8 character', async function () {
    const large = path.join(directory, 'large.csv');
    await fs.writeFile(large, 'Heading\n' + 'é'.repeat(150000));
    await agent.loginAsOwner();
    const {
      body: { meta },
    } = await agent.post('posts/upload/inspect/').attach('postsfile', large).expectStatus(200);
    assert.ok(Buffer.byteLength(meta.rows[0].Heading) <= 256 * 1024);
    assert.doesNotMatch(meta.rows[0].Heading, /�/);
    await agent.delete(`posts/upload/inspect/${meta.upload_id}/`).expectStatus(204);
  });

  for (const scenario of ['multiple CSVs', 'malformed CSV', 'corrupt ZIP']) {
    it(`cleans the uploaded ZIP and all extraction directories after rejecting ${scenario}`, async function () {
      await agent.loginAsOwner();
      const zip = path.join(directory, 'rejected.zip');
      if (scenario === 'corrupt ZIP') {
        await fs.writeFile(zip, 'not a ZIP');
      } else {
        const source = await fs.mkdtemp(path.join(directory, 'rejected-'));
        await fs.writeFile(
          path.join(source, 'posts.csv'),
          scenario === 'malformed CSV' ? 'title\n"Unclosed' : 'title\nOne',
        );
        if (scenario === 'multiple CSVs') {
          await fs.writeFile(path.join(source, 'second.csv'), 'title\nTwo');
        }
        await compress(source, zip);
      }
      const sandbox = sinon.createSandbox();
      const mkdir = sandbox.spy(fs, 'mkdir');
      const unlink = sandbox.spy(fsExtra, 'unlink');
      try {
        await agent
          .post('posts/upload/inspect/')
          .attach('postsfile', zip)
          .expectStatus(scenario === 'corrupt ZIP' ? 415 : 422);

        // Both ZIP classification and CSV inspection extract privately. The
        // original request spool is separately owned by the upload middleware.
        const extracted = mkdir
          .getCalls()
          .filter(
            ({ args: [target, options] }) =>
              options?.mode === 0o700 && path.dirname(target) === os.tmpdir(),
          )
          .map(({ args: [target] }) => target);
        assert.equal(extracted.length, scenario === 'corrupt ZIP' ? 1 : 2);
        for (const target of extracted) {
          assert.equal(await fsExtra.pathExists(target), false);
        }
        await vi.waitFor(async () => {
          sinon.assert.calledOnce(unlink);
          assert.equal(await fsExtra.pathExists(unlink.firstCall.args[0]), false);
        });
      } finally {
        sandbox.restore();
      }
    });
  }

  it('keeps import permission and Labs checks in front of inspection', async function () {
    await agent.loginAsEditor();
    await agent.post('posts/upload/inspect/').attach('postsfile', file).expectStatus(403);
    await agent.loginAsOwner();
    mockManager.mockLabsDisabled('csvContentImporter');
    await agent.post('posts/upload/inspect/').attach('postsfile', file).expectStatus(404);
    await agent.delete('posts/upload/inspect/123456789012345678901234/').expectStatus(404);
  });

  it('confirms the staged source once and preserves the receipt after the worker finishes', async function () {
    mockManager.mockMail();
    await agent.loginAsOwner();
    const {
      body: { meta },
    } = await agent.post('posts/upload/inspect/').attach('postsfile', file).expectStatus(200);

    const confirm = (target) => {
      const form = new FormData();
      form.append('upload_id', meta.upload_id);
      form.append(`mapping[${target}]`, 'title');
      return agent.post('posts/upload/').body(form).expectStatus(202);
    };
    const invalid = new FormData();
    invalid.append('upload_id', meta.upload_id);
    invalid.append('postsfile', await fs.readFile(file), {
      filename: 'posts.csv',
      contentType: 'text/csv',
    });
    const rejected = await agent.post('posts/upload/').body(invalid).expectStatus(422);
    assert.match(rejected.body.errors[0].message, /either a file or a staged CSV upload/);
    const first = await confirm('Heading');
    assert.deepEqual(first.body.meta, { import_id: meta.upload_id });
    await mockManager.assert.sentEmailEventually({ subject: /^Your content import/ });
    const replay = await confirm('Other');
    assert.deepEqual(replay.body, first.body);
    const email = mockManager.assert.sentEmail({ subject: 'Your content import is complete' });
    assert.match(email.html, /Created:<\/strong> 22/);
    mockManager.assert.sentEmailCount(1);
    await agent.delete(`posts/upload/inspect/${meta.upload_id}/`).expectStatus(409);
  });

  it('hands a JSON ZIP to the legacy controller using the same upload', async function () {
    mockManager.mockMail();
    await agent.loginAsOwner();
    const source = path.join(directory, 'legacy');
    await fs.mkdir(source);
    const slug = 'inspected-json-post';
    await fs.writeFile(
      path.join(source, 'content.json'),
      JSON.stringify({
        db: [
          {
            meta: { version: '5.0.0' },
            data: {
              posts: [
                { slug, title: 'Inspected JSON post', status: 'draft', html: '<p>Legacy</p>' },
              ],
            },
          },
        ],
      }),
    );
    const zip = path.join(directory, 'legacy.zip');
    await compress(source, zip);
    const { body, headers } = await agent
      .post('posts/upload/inspect/')
      .attach('postsfile', zip)
      .expectStatus(200);
    assert.equal(body.meta?.upload_id, undefined);
    assert.equal(headers['x-cache-invalidate'], '/*');
    const post = await models.Post.findOne({ slug }, { context: { internal: true } });
    assert.equal(post.get('title'), 'Inspected JSON post');
    const config = await agent.get('config/').expectStatus(200);
    assert.equal(config.body.config.contentImport.stagedInspection, true);
  });
});
