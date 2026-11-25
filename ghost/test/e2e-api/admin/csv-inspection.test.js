const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
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
});
