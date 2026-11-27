import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { GhostServer } from '../../core/server/ghost-server';

const { startGhost, fixtureManager, configUtils, mockManager } = require('../utils/e2e-framework');
const { AdminAPITestAgent } = require('../utils/agents');
const { GhostServer: GhostServerClass } = require('../../core/server/ghost-server');
const models = require('../../core/server/models');
const jobsService = require('../../core/server/services/jobs-service');
const SendEmailJob =
  require('../../core/server/services/email-service/jobs/send-email-job').default;

describe('Retained Posts consumers', function () {
  const sandbox = sinon.createSandbox();
  const listeners = new Map<string, ReturnType<typeof process.rawListeners>>();
  let serverStart: sinon.SinonSpy;
  let ghostServer: GhostServer;

  beforeAll(async function () {
    for (const event of ['SIGINT', 'SIGTERM', 'unhandledRejection'] as const) {
      listeners.set(event, process.rawListeners(event));
    }
    // Also retain a partially started server if boot fails before returning it.
    serverStart = sandbox.spy(GhostServerClass.prototype, 'start');
    configUtils.set('sentry:disabled', true);
    ghostServer = await startGhost({ frontend: true, server: true });
    mockManager.mockMail();
    mockManager.mockStripe();
  });

  it('queues newsletter email and returns post/page copy locations before and after a restart', async function () {
    const postsController = require('../../core/server/api/endpoints/posts');
    const pagesController = require('../../core/server/api/endpoints/pages');

    for (let boot = 0; boot < 2; boot += 1) {
      if (boot > 0) {
        await ghostServer.stop();
        ghostServer = await startGhost({ frontend: true, server: true });
      }
      assert.equal(require('../../core/server/api/endpoints/posts'), postsController);
      assert.equal(require('../../core/server/api/endpoints/pages'), pagesController);
      await fixtureManager.init('newsletters', 'members:newsletters');
      const newsletter = fixtureManager.get('newsletters', 0);
      const agent = new AdminAPITestAgent(ghostServer.rootApp, {
        apiURL: '/ghost/api/admin/',
        originURL: configUtils.config.get('url'),
      });
      await agent.loginAsOwner();

      const dispatch = sandbox.stub(jobsService.getInstance(), 'dispatch').resolves();
      const created = await agent
        .post('posts/')
        .body({ posts: [{ title: `Newsletter on boot ${boot}`, status: 'draft' }] })
        .expectStatus(201);
      const post = created.body.posts[0];
      const published = await agent
        .put(`posts/${post.id}/?newsletter=${newsletter.slug}`)
        .body({ posts: [{ status: 'published', updated_at: post.updated_at }] })
        .expectStatus(200);

      const savedPost = await models.Post.findOne({ id: post.id, status: 'all' });
      const emails = await models.Email.findAll({ filter: `post_id:'${post.id}'` });
      assert.equal(savedPost.get('status'), 'published');
      assert.equal(emails.length, 1);
      const email = emails.models[0];
      assert.equal(email.get('newsletter_id'), newsletter.id);
      assert.equal(email.get('status'), 'pending');
      assert.equal(published.body.posts[0].email.id, email.id);

      const createdPage = await agent
        .post('pages/')
        .body({ pages: [{ title: `Page on boot ${boot}`, status: 'draft' }] })
        .expectStatus(201);
      for (const [resource, original] of [
        ['posts', post],
        ['pages', createdPage.body.pages[0]],
      ] as const) {
        const copied = await agent.post(`${resource}/${original.id}/copy/`).expectStatus(201);
        const copy = copied.body[resource][0];
        assert.notEqual(copy.id, original.id);
        assert.equal(copy.status, 'draft');
        assert.equal(
          new URL(copied.headers.location).pathname,
          `/ghost/api/admin/${resource}/${copy.id}/`,
        );
      }
      const sends = dispatch.getCalls().filter((call) => call.args[0] instanceof SendEmailJob);
      assert.equal(sends.length, 1);
      assert.equal(sends[0].args[0].emailId, email.id);
      dispatch.restore();
    }
  });

  afterAll(async function () {
    try {
      await (serverStart?.lastCall?.thisValue as GhostServer | undefined)?.stop();
    } finally {
      sandbox.restore();
      mockManager.restore();
      for (const [event, originalListeners] of listeners) {
        process.removeAllListeners(event);
        for (const listener of originalListeners) {
          process.on(event, listener as (...args: unknown[]) => void);
        }
      }
      await configUtils.restore();
    }
  });
});
