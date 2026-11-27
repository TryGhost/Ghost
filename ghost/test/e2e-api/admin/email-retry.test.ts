import assert from 'node:assert/strict';
import sinon from 'sinon';
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const db = require('../../../core/server/data/db');
const emailService = require('../../../core/server/services/email-service');
const BatchSendingService = require('../../../core/server/services/email-service/batch-sending-service');
const { waitForEmailStatus } = require('../../utils/batch-email-utils');

describe('Republishing posts with emails', function () {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('posts', 'newsletters', 'members', 'members:emails:failed');
    await agent.loginAsOwner();
  });
  afterEach(function () {
    sinon.restore();
    mockManager.restore();
  });

  for (const concurrentRetry of [false, true]) {
    it(`retries a failed email and returns the claimed email (concurrentRetry=${concurrentRetry})`, async function () {
      const emailId = fixtureManager.get('emails', 1).id;
      const email = await models.Email.findOne({ id: emailId });
      const postId = email.get('post_id');
      const newsletterId = fixtureManager.get('newsletters', 0).id;
      await db
        .knex('emails')
        .where({ id: emailId })
        .update({ status: 'failed', error: 'Previous failure', newsletter_id: newsletterId });
      await db
        .knex('posts')
        .where({ id: postId })
        .update({ status: 'draft', newsletter_id: newsletterId });
      const schedule = sinon.stub(BatchSendingService.prototype, 'scheduleEmail');
      if (concurrentRetry) {
        const retry = emailService.service.retryEmail.bind(emailService.service);
        sinon.stub(emailService.service, 'retryEmail').callsFake(async (staleEmail) => {
          await retry(await models.Email.findOne({ id: emailId }));
          return retry(staleEmail);
        });
      }
      const post = await models.Post.findOne({ id: postId, status: 'all' });
      const response = await agent
        .put(`posts/${postId}/`)
        .body({
          posts: [
            {
              status: 'published',
              updated_at: post.get('updated_at').toISOString(),
            },
          ],
        })
        .expectStatus(200);
      await agent.put(`emails/${emailId}/retry/`).expectStatus(400);
      sinon.assert.calledOnce(schedule);
      assert.equal(response.body.posts[0].status, 'published');
      assert.equal(response.body.posts[0].email.id, emailId);
      assert.equal(response.body.posts[0].email.status, 'pending');
      assert.equal((await db.knex('posts').where({ id: postId }).first()).status, 'published');
    });
  }

  it('republishes an emailed post after its newsletter is archived', async function () {
    mockManager.mockMailgun();

    // Create a newsletter that existing members are subscribed to
    const { body: newsletters } = await agent
      .post('newsletters/?opt_in_existing=true')
      .body({ newsletters: [{ name: 'Archived after sending' }] })
      .expectStatus(201);
    const newsletter = newsletters.newsletters[0];

    // Create a draft post
    const { body: created } = await agent
      .post('posts/')
      .body({ posts: [{ title: 'Republished post', status: 'draft' }] })
      .expectStatus(201);
    const postId = created.posts[0].id;

    // Publish it and send the email
    const { body: published } = await agent
      .put(`posts/${postId}/?newsletter=${newsletter.slug}`)
      .body({ posts: [{ status: 'published', updated_at: created.posts[0].updated_at }] })
      .expectStatus(200);
    const email = await waitForEmailStatus(published.posts[0].email.id);
    assert.equal(email.get('status'), 'submitted');

    // Revert it to draft, which keeps its newsletter because the email exists
    const { body: reverted } = await agent
      .put(`posts/${postId}/`)
      .body({ posts: [{ status: 'draft', updated_at: published.posts[0].updated_at }] })
      .expectStatus(200);

    // Archive the newsletter
    await agent
      .put(`newsletters/${newsletter.id}/`)
      .body({ newsletters: [{ status: 'archived' }] })
      .expectStatus(200);

    // Republish it
    const response = await agent
      .put(`posts/${postId}/`)
      .body({ posts: [{ status: 'published', updated_at: reverted.posts[0].updated_at }] })
      .expectStatus(200);

    assert.equal(response.body.posts[0].status, 'published');
    assert.deepEqual(await db.knex('emails').select('id', 'status').where({ post_id: postId }), [
      { id: email.id, status: 'submitted' },
    ]);
  });
});
