import assert from 'node:assert/strict';
import FormData from 'form-data';
import nock from 'nock';
import sinon from 'sinon';
import supertest from 'supertest';
import type { GhostServer } from '../../core/server/ghost-server';

const { startGhost, fixtureManager, configUtils, mockManager } = require('../utils/e2e-framework');
const { AdminAPITestAgent } = require('../utils/agents');
const { GhostServer: GhostServerClass } = require('../../core/server/ghost-server');
const settingsCache = require('../../core/shared/settings-cache');
const { defaultSettings } = require('../../core/server/data/schema');
const productionDefaults = require('../../core/server/data/schema/default-settings/default-settings.json');
const urlServiceUtils = require('../utils/url-service-utils');
const logging = require('@tryghost/logging');

async function within<T>(promise: Promise<T>, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), 3000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

describe('IndexNow publishing over HTTP', function () {
  const sandbox = sinon.createSandbox();
  const listeners = new Map<string, ReturnType<typeof process.rawListeners>>();
  let serverStart: sinon.SinonSpy;
  let ghostServer: GhostServer;
  let admin: InstanceType<typeof AdminAPITestAgent>;
  let siteURL: string;
  let author: { id: string; slug: string };
  const originalIndexNowDefaults = defaultSettings.indexnow;

  beforeAll(async function () {
    for (const event of ['SIGINT', 'SIGTERM', 'unhandledRejection'] as const) {
      listeners.set(event, process.rawListeners(event));
    }
    serverStart = sandbox.spy(GhostServerClass.prototype, 'start');
    siteURL = new URL('/news/', configUtils.config.get('url')).href;
    configUtils.set('url', siteURL);
    configUtils.set('sentry:disabled', true);

    // The test settings fixture predates IndexNow. Include its production
    // definition so the real settings initializer generates the key on boot.
    defaultSettings.indexnow = structuredClone(productionDefaults.indexnow);

    ghostServer = await startGhost({ frontend: true, server: true });
    await fixtureManager.init();
    admin = new AdminAPITestAgent(ghostServer.rootApp, {
      apiURL: '/news/ghost/api/admin/',
      originURL: siteURL,
    });
    await admin.loginAsOwner();
    const { body } = await admin.get('users/me/').expectStatus(200);
    author = body.users[0];

    // Both relations must reach the URL service for this collection to match.
    // There is no catch-all collection which could hide a missing relation.
    const form = new FormData();
    form.append(
      'routes',
      `routes:
collections:
  /articles/:
    permalink: /articles/{slug}/
    filter: tag:indexnow+author:${author.slug}
taxonomies:
  tag: /tag/{slug}/
  author: /author/{slug}/
`,
      { filename: 'routes.yaml', contentType: 'application/yaml' },
    );
    await admin.post('settings/routes/yaml/').body(form).expectStatus(200);
    await urlServiceUtils.isFinished();
  });

  it('publishes through a filtered collection while its ping is pending and retains the post after a transport failure', async function () {
    const key = settingsCache.get('indexnow_api_key');
    assert.match(key, /^[a-f0-9]{32}$/);
    const keyLocation = new URL(`${key}.txt`, siteURL);
    const verification = await supertest(configUtils.getServerUrl())
      .get(keyLocation.pathname)
      .expect(200);
    assert.equal(verification.text, key);
    assert.match(verification.headers['content-type'], /^text\/plain(?:;|$)/);
    assert.equal(verification.headers['cache-control'], 'public, max-age=86400');

    configUtils.set('privacy:useIndexNow', true);
    const slug = 'indexnow-filtered-publication';
    const postURL = new URL(`articles/${slug}/`, siteURL).href;
    const received = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const failed = Promise.withResolvers<void>();
    const originalWarn = logging.warn;
    const warning = sandbox.stub(logging, 'warn').callsFake(function (...args: unknown[]) {
      const [entry] = args as [{ event?: { name?: string }; post?: { slug?: string } }];
      if (entry?.event?.name === 'indexnow.ping_failed' && entry.post?.slug === slug) {
        failed.resolve();
      }
      return originalWarn.apply(logging, args);
    });
    let requestReceived = false;
    const ping = nock('https://api.indexnow.org')
      .get('/indexnow')
      .query({ url: postURL, key, keyLocation: keyLocation.href })
      .reply(async () => {
        requestReceived = true;
        received.resolve();
        await release.promise;
        throw new Error('IndexNow transport failed');
      });

    const publishing = Promise.resolve(
      admin
        .post('posts/')
        .body({
          posts: [
            {
              title: 'IndexNow filtered publication',
              slug,
              status: 'published',
              authors: [{ id: author.id }],
              tags: [{ name: 'IndexNow', slug: 'indexnow' }],
            },
          ],
        })
        .expectStatus(201),
    );
    let waitedForFailure = false;
    try {
      const [published] = await within(
        Promise.all([publishing, received.promise]),
        'Publication must complete and send the expected IndexNow request before its reply',
      );
      const post = published.body.posts[0];
      assert.equal(post.status, 'published');
      assert.equal(post.url, postURL);
      assert.equal(post.authors[0].id, author.id);
      assert.equal(post.tags[0].slug, 'indexnow');

      release.resolve();
      waitedForFailure = true;
      await within(failed.promise, 'IndexNow did not report the transport failure');
      const failure = warning
        .getCalls()
        .find((call) => call.args[0]?.event?.name === 'indexnow.ping_failed');
      assert.equal(failure?.args[0].http.response.status_code, null);
      assert.equal(failure?.args[0].err.message, 'IndexNow transport failed');
      const { body } = await admin.get(`posts/${post.id}/`).expectStatus(200);
      assert.equal(body.posts[0].status, 'published');
      assert.equal(body.posts[0].url, postURL);
      ping.done();
    } finally {
      release.resolve();
      // A failed assertion must still release the transport and finish the API
      // request. Do not replace that assertion with a second cleanup timeout.
      await Promise.allSettled([
        publishing,
        ...(requestReceived && !waitedForFailure
          ? [within(failed.promise, 'IndexNow transport did not settle during cleanup')]
          : []),
      ]);
    }
  });

  afterAll(async function () {
    try {
      const started = ghostServer ?? (serverStart?.firstCall?.thisValue as GhostServer | undefined);
      await started?.stop();
    } finally {
      sandbox.restore();
      mockManager.restore();
      await configUtils.restore();
      if (originalIndexNowDefaults) {
        defaultSettings.indexnow = originalIndexNowDefaults;
      } else {
        delete defaultSettings.indexnow;
      }
      for (const [event, originalListeners] of listeners) {
        process.removeAllListeners(event);
        for (const listener of originalListeners) {
          process.on(event, listener as (...args: unknown[]) => void);
        }
      }
    }
  });
});
