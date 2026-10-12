import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import nock from 'nock';
import sinon from 'sinon';
import supertest from 'supertest';
import type { Response } from 'supertest';
import type { GhostServer } from '../../core/server/ghost-server';
import type { SlackPingService as SlackPingInstance } from '../../core/server/services/slack-ping/slack-ping-service';

const { startGhost, fixtureManager, configUtils } = require('../utils/e2e-framework');
const { AdminAPITestAgent } = require('../utils/agents');
const { GhostServer: GhostServerClass } = require('../../core/server/ghost-server');
const {
  SlackPingService,
}: typeof import('../../core/server/services/slack-ping/slack-ping-service') = require('../../core/server/services/slack-ping/slack-ping-service');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const sentry = require('../../core/shared/sentry');

const webhook = 'https://hooks.slack.example';
const webhookPath = '/services/ghost/contracts';

// A route regression must fail and release the held webhook in finally,
// rather than reaching the suite timeout before cleanup can run.
async function within<T>(promise: Promise<T>, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), 3000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

describe('Slack notifications through HTTP and model events', function () {
  const sandbox = sinon.createSandbox();
  const listeners = new Map<string, ReturnType<typeof process.rawListeners>>();
  let ghostServer: GhostServer | undefined;
  let serverStart: sinon.SinonSpy;
  let ping: sinon.SinonSpy;
  let loggedError: sinon.SinonStub;
  let admin: InstanceType<typeof AdminAPITestAgent>;
  let routesPath: string;
  let originURL: string;
  let cookies: string[];

  beforeAll(async function () {
    for (const event of ['SIGINT', 'SIGTERM', 'unhandledRejection'] as const) {
      listeners.set(event, process.rawListeners(event));
    }
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
    serverStart = sandbox.spy(GhostServerClass.prototype, 'start');
    const originalPing: SlackPingInstance['ping'] = SlackPingService.prototype.ping;
    // Shared events do not await listener work. Observe every real delivery
    // immediately so a broken error handler still reaches assertions and cleanup.
    ping = sandbox.stub(SlackPingService.prototype, 'ping').callsFake(function (
      this: SlackPingInstance,
      ...args: Parameters<SlackPingInstance['ping']>
    ) {
      const result = originalPing.apply(this, args);
      void result?.catch(() => {});
      return result;
    });
    loggedError = sandbox.stub(logging, 'error');
    routesPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-slack-routes-'));
    await fs.writeFile(
      path.join(routesPath, 'routes.yaml'),
      `routes:
collections:
  /updates/:
    permalink: /updates/{slug}/
    template: index
    filter: tag:slack-featured
  /:
    permalink: /{slug}/
    template: index
    filter: tag:-slack-featured
taxonomies:
  tag: /topics/{slug}/
  author: /writers/{slug}/
`,
    );
    configUtils.set('adapters:route-settings:FileStore:basePath', routesPath);
    configUtils.set('sentry:disabled', true);
    ghostServer = await startGhost({ frontend: true, server: true });
    await fixtureManager.init();
    originURL = configUtils.config.get('url');
    // The framework disables external network and supplies the DNS test stub;
    // Nock intercepts the production request-external client below.
    admin = new AdminAPITestAgent(ghostServer!.rootApp, {
      apiURL: '/ghost/api/admin/',
      originURL,
    });
    cookies = await admin.loginAs(null, null, 'owner');
    await admin
      .put('settings/')
      .body({
        settings: [
          { key: 'slack_url', value: `${webhook}${webhookPath}` },
          { key: 'slack_username', value: 'Publication updates' },
          { key: 'title', value: 'Slack contract publication' },
          { key: 'icon', value: '/content/images/slack-icon.ico' },
        ],
      })
      .expectStatus(200);
  });

  beforeEach(function () {
    ping.resetHistory();
    loggedError.resetHistory();
  });

  it('returns HTTP success while a test notification is pending, then logs and absorbs delivery failure', async function () {
    const received = Promise.withResolvers<unknown>();
    const release = Promise.withResolvers<void>();
    const scope = nock(webhook, { reqheaders: { 'content-type': 'application/json' } })
      .post(webhookPath)
      .reply(async (uri, body) => {
        received.resolve(body);
        await release.promise;
        return [500, 'Slack unavailable'];
      });
    let request: Promise<unknown> | undefined;
    let delivery: Promise<unknown> | undefined;

    try {
      request = Promise.resolve(
        supertest(configUtils.getServerUrl())
          .post('/ghost/api/admin/slack/test/')
          .set('Cookie', cookies)
          .set('Origin', originURL)
          .send({})
          .expect(200),
      );
      void request.catch(() => {});
      const payload = await within(received.promise, 'The Slack test route did not send a webhook');
      await within(request!, 'The Slack test route waited for webhook delivery');
      sinon.assert.calledOnce(ping);
      delivery = ping.firstCall.returnValue;
      assert.ok(delivery instanceof Promise);
      sinon.assert.notCalled(loggedError);
      assert.deepEqual(payload, {
        text: 'Heya! This is a test notification from your Ghost blog :smile:. Seems to work fine!',
        unfurl_links: true,
        icon_url: new URL('/content/images/slack-icon.ico', originURL).href,
        username: 'Publication updates',
      });

      release.resolve();
      await assert.doesNotReject(delivery);
      sinon.assert.calledOnce(loggedError);
      const error = loggedError.firstCall.args[0];
      assert.ok(error instanceof errors.InternalServerError);
      assert.equal(
        error.context,
        'The slack service was unable to send a ping request, your site will continue to function.',
      );
      scope.done();
    } finally {
      release.resolve();
      await Promise.allSettled([request, delivery, ...ping.returnValues]);
      nock.cleanAll();
    }
  });

  it('publishes a tagged post to Slack using the real collection, author and image URLs', async function () {
    const received = Promise.withResolvers<{
      text: string;
      username: string;
      icon_url: string;
      attachments: Array<{
        title: string;
        title_link: string;
        image_url: string;
        footer_icon: string;
        fields: Array<{ title: string; value: string }>;
      }>;
    }>();
    const release = Promise.withResolvers<void>();
    const scope = nock(webhook, { reqheaders: { 'content-type': 'application/json' } })
      .post(webhookPath)
      .reply(async (uri, body) => {
        received.resolve(body as Awaited<typeof received.promise>);
        await release.promise;
        return [200, 'ok'];
      });
    let request: Promise<Response> | undefined;
    let delivery: Promise<unknown> | undefined;

    try {
      request = Promise.resolve(
        supertest(configUtils.getServerUrl())
          .post('/ghost/api/admin/posts/?source=html')
          .set('Cookie', cookies)
          .set('Origin', originURL)
          .send({
            posts: [
              {
                title: 'A tagged Slack publication',
                slug: 'slack-tagged-publication',
                status: 'published',
                html: '<p>The ordinary post body.</p>',
                custom_excerpt: 'Use the custom excerpt in Slack.',
                feature_image: '/content/images/slack-feature.png',
                tags: [{ name: 'Slack featured', slug: 'slack-featured' }],
              },
            ],
          })
          .expect(201),
      );
      void request.catch(() => {});
      const payload = await within(received.promise, 'Publishing did not send a Slack webhook');
      const response = await within(request!, 'Publishing waited for webhook delivery');
      sinon.assert.calledOnce(ping);
      delivery = ping.firstCall.returnValue;
      assert.ok(delivery instanceof Promise);
      const author = response.body.posts[0].authors[0];
      assert.ok(author);
      assert.equal(payload.text, 'Notification from *Slack contract publication* :ghost:');
      assert.equal(payload.username, 'Publication updates');
      assert.equal(payload.icon_url, new URL('/content/images/slack-icon.ico', originURL).href);
      assert.equal(payload.attachments[0].title, 'A tagged Slack publication');
      assert.equal(
        payload.attachments[0].title_link,
        new URL('/updates/slack-tagged-publication/', originURL).href,
      );
      assert.equal(
        payload.attachments[0].image_url,
        new URL('/content/images/slack-feature.png', originURL).href,
      );
      assert.equal(payload.attachments[0].fields[0].value, 'Use the custom excerpt in Slack.');
      assert.equal(
        payload.attachments[1].fields[0].value,
        `<${new URL(`/writers/${author.slug}/`, originURL).href} | ${author.name}>`,
      );
      assert.equal(payload.attachments[1].footer_icon, payload.icon_url);

      release.resolve();
      await assert.doesNotReject(delivery);
      sinon.assert.notCalled(loggedError);
      scope.done();
    } finally {
      release.resolve();
      await Promise.allSettled([request, delivery, ...ping.returnValues]);
      nock.cleanAll();
    }
  });

  afterAll(async function () {
    try {
      const started = ghostServer ?? (serverStart?.firstCall?.thisValue as GhostServer | undefined);
      await started?.stop();
    } finally {
      sandbox.restore();
      nock.cleanAll();
      for (const [event, originalListeners] of listeners) {
        process.removeAllListeners(event);
        for (const listener of originalListeners) {
          process.on(event, listener as (...args: unknown[]) => void);
        }
      }
      try {
        await configUtils.restore();
      } finally {
        if (routesPath) {
          await fs.remove(routesPath);
        }
      }
    }
  });
});
