import assert from 'node:assert/strict';
import { vi } from 'vitest';
import type { Knex } from 'knex';
import type { GhostServer } from '../../../../core/server/ghost-server';
import sinon, { type SinonStub } from 'sinon';
const { agentProvider, fixtureManager, mockManager } = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const events = require('../../../../core/server/lib/common/events');
const jobsService = require('../../../../core/server/services/jobs-service');
const SendEmailJob =
  require('../../../../core/server/services/email-service/jobs/send-email-job').default;
const EmailService = require('../../../../core/server/services/email-service/email-service');
const getPostsService = require('../../../../core/server/services/posts/posts-service-instance');
const scheduling = require('../../../../core/server/services/posts/post-scheduling');

describe('Atomic newsletter publication', function () {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  let ghostServer: GhostServer;
  let post: { id: string; get(key: 'updated_at'): Date };
  let newsletter: { id: string; slug: string };

  let dispatch: SinonStub;

  beforeAll(async function () {
    const agents = await agentProvider.getAgentsWithFrontend();
    agent = agents.adminAgent;
    ghostServer = agents.ghostServer;
    await fixtureManager.init('newsletters', 'members:newsletters');
    await agent.loginAsOwner();
    newsletter = fixtureManager.get('newsletters', 0);
  });

  beforeEach(async function () {
    mockManager.mockMail();
    mockManager.mockStripe();
    dispatch = sinon.stub(jobsService.getInstance(), 'dispatch').resolves();
    post = await models.Post.add(
      {
        title: 'Atomic newsletter publication',
        status: 'draft',
      },
      { context: { internal: true } },
    );
  });

  afterEach(function () {
    sinon.restore();
    mockManager.restore();
  });

  afterAll(async function () {
    await ghostServer.stop();
  });

  const frame = (
    transacting?: Knex.Transaction,
    options: { newsletter?: string; email_segment?: string } = {},
  ) => ({
    data: { posts: [{ status: 'published' }] },
    options: {
      id: post.id,
      context: { internal: true },
      transacting,
      newsletter: newsletter.slug as string | undefined,
      withRelated: ['email'],
      ...options,
    },
  });

  const readPost = () => models.Post.findOne({ id: post.id, status: 'all' });
  const readEmail = (transacting?: Knex.Transaction) =>
    models.Email.findOne({ post_id: post.id }, { transacting });
  const sendingJobs = () =>
    dispatch.getCalls().filter((call) => call.args[0] instanceof SendEmailJob);

  it('rolls back publication when the email insert fails and allows a retry', async function () {
    const addEmail = sinon.stub(models.Email, 'add').rejects(new Error('Email insert failed'));
    const publishEvents = sinon.spy(events, 'emit');
    await agent
      .put(`posts/${post.id}/?newsletter=${newsletter.slug}`)
      .body({ posts: [{ status: 'published', updated_at: post.get('updated_at').toISOString() }] })
      .expectStatus(500);
    assert.equal((await readPost()).get('status'), 'draft');
    assert.equal(await readEmail(), null);
    assert.equal(sendingJobs().length, 0);
    assert.equal(publishEvents.calledWith('post.published'), false);

    addEmail.restore();
    await agent
      .put(`posts/${post.id}/?newsletter=${newsletter.slug}`)
      .body({ posts: [{ status: 'published', updated_at: post.get('updated_at').toISOString() }] })
      .expectStatus(200);
    assert.equal((await readPost()).get('status'), 'published');
    assert.equal((await readEmail()).get('status'), 'pending');
    assert.equal(sendingJobs().length, 1);
  });

  it('rolls back the post and inserted email when an outer transaction fails', async function () {
    await assert.rejects(
      models.Post.transaction(async (transacting: Knex.Transaction) => {
        await getPostsService().editPost(frame(transacting));
        assert.ok(await readEmail(transacting));
        assert.equal(sendingJobs().length, 0);
        throw new Error('Outer transaction failed');
      }),
      /Outer transaction failed/,
    );
    assert.equal((await readPost()).get('status'), 'draft');
    assert.equal(await readEmail(), null);
    assert.equal(sendingJobs().length, 0);
  });

  it('commits both records before scheduling the email', async function () {
    await models.Post.transaction(async (transacting: Knex.Transaction) => {
      await getPostsService().editPost(frame(transacting));
      assert.ok(await readEmail(transacting));
      assert.equal(sendingJobs().length, 0);
    });
    // Work after a caller's commit runs asynchronously.
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    assert.equal((await readPost()).get('status'), 'published');
    assert.equal((await readEmail()).get('status'), 'pending');
    assert.equal(sendingJobs().length, 1);
  });

  it('checks and emails the saved newsletter and audience when publishing a scheduled post', async function () {
    const publishedAt = new Date(Date.now() + 5 * 60 * 1000);
    await models.Post.edit({ status: 'scheduled', published_at: publishedAt }, frame().options);
    sinon.useFakeTimers({ now: publishedAt, toFake: ['Date'] });
    const checks = sinon.spy(EmailService.prototype, 'checkCanSendEmail');

    await getPostsService().editPost(
      frame(undefined, {
        newsletter: fixtureManager.get('newsletters', 1).slug,
        email_segment: 'status:free',
      }),
    );

    // Checked once, before the save, so nothing queries outside the publishing transaction
    sinon.assert.calledOnce(checks);
    assert.equal(checks.firstCall.args[0].id, newsletter.id);
    assert.equal(checks.firstCall.args[1], 'all');
    const email = await readEmail();
    assert.equal((await readPost()).get('status'), 'published');
    assert.equal(email.get('newsletter_id'), newsletter.id);
    assert.equal(email.get('recipient_filter'), 'all');
    assert.equal(sendingJobs().length, 1);
  });

  it('creates one email when two publication requests overlap', async function () {
    await Promise.all([getPostsService().editPost(frame()), getPostsService().editPost(frame())]);
    assert.equal((await readPost()).get('status'), 'published');
    const emails = await models.Email.findAll({ filter: `post_id:'${post.id}'` });
    assert.equal(emails.length, 1);
    assert.equal(sendingJobs().length, 1);
  });

  it('keeps a failed scheduled publication scheduled so the scheduler can retry', async function () {
    const publishedAt = new Date(Date.now() + 5 * 60 * 1000);
    await models.Post.edit({ status: 'scheduled', published_at: publishedAt }, frame().options);
    sinon.useFakeTimers({ now: publishedAt, toFake: ['Date'] });
    const addEmail = sinon.stub(models.Email, 'add').rejects(new Error('Scheduled insert failed'));
    const options = { id: post.id, context: { internal: true } };
    await assert.rejects(
      scheduling.publish('posts', post.id, true, options),
      /Scheduled insert failed/,
    );
    assert.equal((await readPost()).get('status'), 'scheduled');
    assert.equal(await readEmail(), null);
    assert.equal(sendingJobs().length, 0);
    addEmail.restore();
    await scheduling.publish('posts', post.id, true, options);
    assert.equal((await readPost()).get('status'), 'published');
    assert.ok(await readEmail());
    assert.equal(sendingJobs().length, 1);
  });

  it('publishes before retrying a failed email and rejects if scheduling the retry fails', async function () {
    await getPostsService().editPost(frame());
    await models.Post.edit({ status: 'draft' }, { id: post.id, context: { internal: true } });
    await (await readEmail()).save({ status: 'failed', error: 'Send failed' }, { patch: true });
    dispatch.throws(new Error('Scheduling retry failed'));

    await assert.rejects(getPostsService().editPost(frame()), /Scheduling retry failed/);

    const email = await readEmail();
    assert.equal((await readPost()).get('status'), 'published');
    assert.equal(email.get('status'), 'failed');
    assert.equal(email.get('error'), 'Send failed');
  });

  it('retries a failed email once a caller-owned transaction commits', async function () {
    await getPostsService().editPost(frame());
    await models.Post.edit({ status: 'draft' }, { id: post.id, context: { internal: true } });
    await (await readEmail()).save({ status: 'failed' }, { patch: true });
    dispatch.resetHistory();

    await models.Post.transaction(async (transacting: Knex.Transaction) => {
      await getPostsService().editPost(frame(transacting));
      assert.equal((await readEmail(transacting)).get('status'), 'failed');
    });

    await vi.waitFor(() => {
      assert.equal(sendingJobs().length, 1);
    });
    assert.equal((await readEmail()).get('status'), 'pending');
  });
});
