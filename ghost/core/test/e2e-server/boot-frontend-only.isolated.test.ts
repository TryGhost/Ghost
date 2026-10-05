import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';
import supertest from 'supertest';
import type { GhostServer } from '../../core/server/ghost-server';

const { GhostServer: GhostServerClass } = require('../../core/server/ghost-server');
const { startGhost, fixtureManager, configUtils } = require('../utils/e2e-framework');
const db = require('../../core/server/data/db');
const sentry = require('../../core/shared/sentry');
const cheerio = require('cheerio');

describe('Frontend-only boot', function () {
  it('serves configured public and member routes without mounting the backend', async function () {
    const routesPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-frontend-routes-'));
    const listeners = new Map(
      (['SIGINT', 'SIGTERM', 'unhandledRejection'] as const).map((event) => [
        event,
        process.rawListeners(event),
      ]),
    );
    let ghostServer: GhostServer | undefined;
    const sandbox = sinon.createSandbox();
    const serverStart = sandbox.spy(GhostServerClass.prototype, 'start');
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');

    try {
      await fs.writeFile(
        path.join(routesPath, 'routes.yaml'),
        `routes:
collections:
  /:
    permalink: /articles/{slug}/
    template: index
taxonomies:
  tag: /topics/{slug}/
  author: /writers/{slug}/
`,
      );
      configUtils.set('adapters:route-settings:FileStore:basePath', routesPath);
      // Otherwise the frontend deliberately redirects /ghost/* to Admin.
      configUtils.set('admin:redirects', false);
      configUtils.set('sentry:disabled', true);

      ghostServer = await startGhost({ backend: false, frontend: true, server: true });
      assert.ok(ghostServer);
      await fixtureManager.init('users', 'posts');
      const post = await db.knex('posts').where({ type: 'post', status: 'published' }).first();
      assert.ok(post);

      const agent = supertest(configUtils.getServerUrl());
      const response = await agent.get(`/articles/${post.slug}/`).expect(200);
      assert.match(response.headers['content-type'], /text\/html/);
      assert.ok(response.text.includes(post.title));
      assert.equal(
        cheerio.load(response.text)('link[rel="canonical"]').attr('href'),
        new URL(`/articles/${post.slug}/`, configUtils.config.get('url')).href,
      );
      await agent.get('/members/api/session').expect(204);
      await agent.get('/ghost/api/admin/site/').expect(404);
      await agent.get('/ghost/api/content/posts/').expect(404);
    } finally {
      try {
        const startedServer =
          ghostServer ?? (serverStart.firstCall?.thisValue as GhostServer | undefined);
        await startedServer?.stop();
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
