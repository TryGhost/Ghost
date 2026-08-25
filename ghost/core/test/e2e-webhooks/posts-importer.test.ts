import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const DomainEvents = require('@tryghost/domain-events');
const { agentProvider, mockManager, fixtureManager, dbUtils } = require('../utils/e2e-framework');
const models = require('../../core/server/models');
const jobsService = require('../../core/server/services/jobs');

// The importer's key safety guarantee: a bulk import sends zero newsletter emails
// and fires zero per-post webhooks. Every consumer of post events checks
// options.importing, one deleted `if` away from breaking; this suite turns that
// into a test failure.
describe('CSV content import side-effects', function () {
  // The e2e framework has no published types; any matches the other TS e2e suites
  let adminAPIAgent: any;
  let webhookMockReceiver: any;
  let tmpDir: string;

  beforeAll(async function () {
    adminAPIAgent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('integrations');
    await adminAPIAgent.loginAsOwner();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'posts-importer-webhooks-'));
  });

  afterAll(async function () {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  beforeEach(async function () {
    await dbUtils.truncate('webhooks');
    webhookMockReceiver = mockManager.mockWebhookRequests();
    mockManager.mockMail();
  });

  afterEach(async function () {
    await jobsService.allSettled();
    mockManager.restore();
  });

  it('publishing through the API does trigger the webhook (the control for the import test)', async function () {
    const webhookURL = 'https://test-webhook-receiver.com/post-published-control/';
    await webhookMockReceiver.mock(webhookURL);
    await fixtureManager.insertWebhook({
      event: 'post.published',
      url: webhookURL,
    });

    const res = await adminAPIAgent
      .post('posts/')
      .body({
        posts: [
          {
            title: 'Webhook control post',
            status: 'draft',
            lexical: fixtureManager.get('posts', 1).lexical,
          },
        ],
      })
      .expectStatus(201);

    const updatedPost = res.body.posts[0];
    updatedPost.status = 'published';

    await adminAPIAgent
      .put('posts/' + updatedPost.id)
      .body({ posts: [updatedPost] })
      .expectStatus(200);

    await webhookMockReceiver.receivedRequest();

    assert.ok(
      webhookMockReceiver.body,
      'the receiver records a normal API publish — a silent import below means suppression, not a broken mock',
    );
  });

  it('importing a CSV fires no webhooks and sends nothing', async function () {
    // post.added would fire even if a future change stopped importing as
    // published, so both events are armed.
    const publishedURL = 'https://test-webhook-receiver.com/post-published-import/';
    const addedURL = 'https://test-webhook-receiver.com/post-added-import/';
    await webhookMockReceiver.mock(publishedURL);
    await webhookMockReceiver.mock(addedURL);
    await fixtureManager.insertWebhook({ event: 'post.published', url: publishedURL });
    await fixtureManager.insertWebhook({ event: 'post.added', url: addedURL });

    const csvPath = path.join(tmpDir, 'posts-import-side-effects.csv');
    await fs.writeFile(
      csvPath,
      'title,html,published_at\n' +
        'Side effect check one,<p>First</p>,2024-07-01T00:00:00.000Z\n' +
        'Side effect check two,<p>Second</p>,2024-07-02T00:00:00.000Z\n',
    );

    await adminAPIAgent.post('posts/upload/').attach('postsfile', csvPath).expectStatus(202);

    await jobsService.allSettled();
    await DomainEvents.allSettled();
    // The negative needs a settle window: a wrongly-fired webhook reaches nock a
    // beat after the model event, and asserting too early would pass vacuously
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });

    // Guard against a vacuous pass: the import actually ran
    const { data: posts } = await models.Post.findPage({
      filter: `title:~'Side effect check'`,
      status: 'all',
      limit: 'all',
    });
    assert.equal(posts.length, 2, 'both rows imported');
    assert.equal(posts[0].get('status'), 'published');

    // Zero webhooks: the receiver never recorded a request
    assert.equal(webhookMockReceiver.body, undefined, 'no webhook fired for the imported posts');

    // Zero transactional mail
    mockManager.assert.sentEmailCount(0);

    // Zero newsletters: a newsletter can only be attached via the API layer, which
    // the importer never touches.
    const { data: emails } = await models.Email.findPage({ limit: 'all' });
    assert.equal(emails.length, 0, 'no newsletter emails were created');
  });
});
