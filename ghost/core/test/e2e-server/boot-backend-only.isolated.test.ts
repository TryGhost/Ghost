import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import FormData from 'form-data';
import sinon from 'sinon';
import supertest from 'supertest';
import type { Application } from 'express';
import type { GhostServer } from '../../core/server/ghost-server';

const { GhostServer: GhostServerClass } = require('../../core/server/ghost-server');
const { startGhost, fixtureManager, configUtils } = require('../utils/e2e-framework');
const { AdminAPITestAgent, ContentAPITestAgent } = require('../utils/agents');
const jobsService = require('../../core/server/services/jobs-service');
const stripe = require('../../core/server/services/stripe');
const sentry = require('../../core/shared/sentry');

const routes = (prefix: string) => `routes:
collections:
  /:
    permalink: /${prefix}/{slug}/
    template: index
taxonomies:
  tag: /topics/{slug}/
  author: /writers/{slug}/
`;

describe('Backend-only boot', function () {
  it('builds and reloads public URLs without mounting the frontend or starting a listener', async function () {
    const routesPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-backend-routes-'));
    const listeners = new Map(
      (['SIGINT', 'SIGTERM', 'unhandledRejection'] as const).map((event) => [
        event,
        process.rawListeners(event),
      ]),
    );
    const sandbox = sinon.createSandbox();
    const serverStart = sandbox.spy(GhostServerClass.prototype, 'start');
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');

    try {
      await fs.writeFile(path.join(routesPath, 'routes.yaml'), routes('articles'));
      // Exercise the real FileStore before boot, independently of the default
      // routes file that startGhost prepares in its temporary content folder.
      configUtils.set('adapters:route-settings:FileStore:basePath', routesPath);
      configUtils.set('sentry:disabled', true);

      const app: Application = await startGhost({
        backend: true,
        frontend: false,
        server: false,
      });
      sinon.assert.notCalled(serverStart);
      assert.equal(typeof app, 'function');

      await fixtureManager.init('users', 'posts', 'api_keys');
      const originURL = configUtils.config.get('url');
      const content = new ContentAPITestAgent(app, {
        apiURL: '/ghost/api/content/',
        originURL,
      });
      const admin = new AdminAPITestAgent(app, {
        apiURL: '/ghost/api/admin/',
        originURL,
      });
      await admin.get('site/').expectStatus(200);
      await content.authenticate();
      await admin.loginAsOwner();

      const postsPath = 'posts/?limit=1&fields=id,slug,url';
      const { body: initial } = await content.get(postsPath).expectStatus(200);
      const post = initial.posts[0];
      assert.ok(post);
      assert.equal(post.url, new URL(`/articles/${post.slug}/`, originURL).href);

      const { body: tags } = await content.get('tags/?limit=1&fields=slug,url').expectStatus(200);
      assert.ok(tags.tags[0]);
      assert.equal(tags.tags[0].url, new URL(`/topics/${tags.tags[0].slug}/`, originURL).href);
      await supertest(app).get(`/articles/${post.slug}/`).expect(404);
      await supertest(app).get('/members/api/session').expect(404);

      const form = new FormData();
      form.append('routes', routes('journal'), {
        filename: 'routes.yaml',
        contentType: 'application/yaml',
      });
      await admin.post('settings/routes/yaml/').body(form).expectStatus(200);

      // Keep the same consumer and loaded services across the real reload.
      const { body: updated } = await content.get(postsPath).expectStatus(200);
      assert.equal(updated.posts[0].id, post.id);
      assert.equal(updated.posts[0].url, new URL(`/journal/${post.slug}/`, originURL).href);
      await admin.get('site/').expectStatus(200);
      await supertest(app).get(`/journal/${post.slug}/`).expect(404);
    } finally {
      try {
        const ghostServer = serverStart.firstCall?.thisValue as GhostServer | undefined;
        if (ghostServer) {
          await ghostServer.stop();
        } else {
          // server:false has no GhostServer to own these resources. This is
          // fixture cleanup, not a new production shutdown guarantee.
          try {
            await jobsService.shutdown();
          } finally {
            await stripe.shutdown();
          }
        }
      } finally {
        sandbox.restore();
        for (const [event, originalListeners] of listeners) {
          process.removeAllListeners(event);
          for (const listener of originalListeners) {
            process.on(event, listener as (...args: unknown[]) => void);
          }
        }
        try {
          await configUtils.restore();
        } finally {
          await fs.remove(routesPath);
        }
      }
    }
  });
});
