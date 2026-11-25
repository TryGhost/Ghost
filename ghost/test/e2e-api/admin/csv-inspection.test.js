const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const FormData = require('form-data');
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
    assert.deepEqual(first.body.meta, { import_id: meta.upload_id, total: 22 });
    await mockManager.assert.sentEmailEventually({ subject: 'Your content import is complete' });
    const replay = await confirm('Other');
    assert.deepEqual(replay.body, first.body);
    const email = mockManager.assert.sentEmail({ subject: 'Your content import is complete' });
    assert.match(email.html, /Created:<\/strong> 22/);
    mockManager.assert.sentEmailCount(1);
    await agent.delete(`posts/upload/inspect/${meta.upload_id}/`).expectStatus(409);
  });
});
