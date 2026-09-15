const assert = require('node:assert/strict');
const sinon = require('sinon');
const { agentProvider, fixtureManager, mockManager } = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const events = require('../../../../core/server/lib/common/events');
const jobManager = require('../../../../core/server/services/jobs/job-service');
const EmailService = require('../../../../core/server/services/email-service/email-service');
const getPostsService = require('../../../../core/server/services/posts/posts-service-instance');
const scheduling = require('../../../../core/server/services/posts/post-scheduling');

describe('Atomic newsletter publication', function () {
  let agent;
  let ghostServer;
  let post;
  let newsletter;

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
    sinon.stub(jobManager, 'addJob');
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

  const frame = (status = 'published', transacting) => ({
    data: { posts: [{ status, posts_meta: { email_only: status === 'sent' } }] },
    options: {
      id: post.id,
      context: { internal: true },
      transacting,
      newsletter: newsletter.slug,
      withRelated: ['email'],
    },
  });

  const readPost = () => models.Post.findOne({ id: post.id, status: 'all' });
  const readEmail = (transacting) => models.Email.findOne({ post_id: post.id }, { transacting });
  const sendingJobs = () =>
    jobManager.addJob
      .getCalls()
      .filter((call) => call.args[0].name === 'batch-sending-service-job');

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
      models.Post.transaction(async (transacting) => {
        await getPostsService().editPost(frame('published', transacting));
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

  for (const status of ['published', 'sent']) {
    it(`commits both records before scheduling a ${status} post`, async function () {
      await models.Post.transaction(async (transacting) => {
        await getPostsService().editPost(frame(status, transacting));
        assert.ok(await readEmail(transacting));
        assert.equal(sendingJobs().length, 0);
      });
      // Bookshelf's commit event listeners schedule work asynchronously.
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      assert.equal((await readPost()).get('status'), status);
      assert.equal((await readEmail()).get('status'), 'pending');
      assert.equal(sendingJobs().length, 1);
    });
  }

  it('rolls back when the saved audience differs from preparation', async function () {
    const prepare = EmailService.prototype.prepareEmail;
    sinon.stub(EmailService.prototype, 'prepareEmail').callsFake(async function (...args) {
      const prepared = await prepare.apply(this, args);
      return { ...prepared, emailRecipientFilter: 'status:free' };
    });
    await assert.rejects(getPostsService().editPost(frame()), { name: 'UpdateCollisionError' });
    assert.equal((await readPost()).get('status'), 'draft');
    assert.equal(await readEmail(), null);
    assert.equal(sendingJobs().length, 0);
  });

  it('does not publish if preparation fails', async function () {
    sinon.stub(EmailService.prototype, 'prepareEmail').rejects(new Error('Preparation failed'));
    await assert.rejects(getPostsService().editPost(frame()), /Preparation failed/);
    assert.equal((await readPost()).get('status'), 'draft');
    assert.equal(await readEmail(), null);
    assert.equal(sendingJobs().length, 0);
  });

  it('creates one email when two publication requests overlap', async function () {
    await Promise.all([getPostsService().editPost(frame()), getPostsService().editPost(frame())]);
    assert.equal((await readPost()).get('status'), 'published');
    assert.ok(await readEmail());
    assert.equal(sendingJobs().length, 1);
  });

  it('publishes without an email when no newsletter was requested', async function () {
    const postOnlyFrame = frame();
    delete postOnlyFrame.options.newsletter;
    await getPostsService().editPost(postOnlyFrame);
    assert.equal((await readPost()).get('status'), 'published');
    assert.equal(await readEmail(), null);
    assert.equal(sendingJobs().length, 0);
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

  it('rolls back a failed email retry with its publication', async function () {
    await getPostsService().editPost(frame());
    await models.Post.edit({ status: 'draft' }, { id: post.id, context: { internal: true } });
    await (await readEmail()).save({ status: 'failed' }, { patch: true });
    jobManager.addJob.resetHistory();
    await assert.rejects(
      models.Post.transaction(async (transacting) => {
        await getPostsService().editPost(frame('published', transacting));
        assert.equal((await readEmail(transacting)).get('status'), 'pending');
        assert.equal(sendingJobs().length, 0);
        throw new Error('Rollback retry');
      }),
      /Rollback retry/,
    );
    assert.equal((await readPost()).get('status'), 'draft');
    assert.equal((await readEmail()).get('status'), 'failed');
    assert.equal(sendingJobs().length, 0);
  });
});
