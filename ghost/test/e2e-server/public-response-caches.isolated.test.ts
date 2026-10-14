import assert from 'node:assert/strict';
import sinon from 'sinon';

const configUtils = require('../utils/config-utils');
const { agentProvider, fixtureManager } = require('../utils/e2e-framework');
const db = require('../../core/server/data/db');
const events = require('../../core/server/lib/common/events');
const models = require('../../core/server/models');

describe('Configured public response caches over HTTP', function () {
  let agent: Awaited<ReturnType<typeof agentProvider.getContentAPIAgent>>;
  let ghostServer: { stop(): Promise<void> } | undefined;
  let postId: string;
  let pageId: string;
  let tagId: string;
  const sandbox = sinon.createSandbox();

  beforeAll(async function () {
    // Both roots capture config during initialization, and the endpoints capture
    // the resulting adapters during import. This file needs its own cold boot.
    configUtils.set('hostSettings:tagsPublicCache:enabled', true);
    configUtils.set('hostSettings:postsPublicCache:enabled', true);
    configUtils.set('adapters:cache:tagsPublic', { active: 'MemoryCache' });
    configUtils.set('adapters:cache:postsPublic', { active: 'MemoryCache' });
    configUtils.set('sentry:disabled', true);
    ({ contentAPIAgent: agent, ghostServer } = await agentProvider.getAgentsWithFrontend());
    await fixtureManager.init('users', 'posts', 'tags:extra', 'api_keys');
    await agent.authenticate();

    ({ id: postId } = await db.knex('posts').where({ type: 'post', status: 'published' }).first());
    ({ id: pageId } = await db.knex('posts').where({ type: 'page', status: 'published' }).first());
    ({ id: tagId } = await db.knex('tags').where({ visibility: 'public' }).first());
  });

  beforeEach(function () {
    // MemoryCache resets synchronously when the real service receives this event.
    events.emit('site.changed');
  });

  afterEach(function () {
    sandbox.restore();
  });

  afterAll(async function () {
    try {
      await ghostServer?.stop();
    } finally {
      await configUtils.restore();
    }
  });

  const endpoints = [
    {
      name: 'tags browse',
      cached: true,
      table: 'tags',
      field: 'name',
      resource: 'tags',
      path: () => 'tags/?limit=all&fields=id,name&order=id%20asc',
      query: () => sandbox.spy(models.TagPublic, 'findPage'),
    },
    {
      name: 'posts browse',
      cached: true,
      table: 'posts',
      field: 'title',
      resource: 'posts',
      path: () => 'posts/?limit=all&fields=id,title&order=id%20asc',
      query: () => sandbox.spy(models.Post, 'findPage'),
    },
    {
      name: 'posts read',
      cached: true,
      table: 'posts',
      field: 'title',
      resource: 'posts',
      path: () => `posts/${postId}/?fields=id,title`,
      query: () => sandbox.spy(models.Post, 'findOne'),
    },
    {
      name: 'tags read',
      cached: false,
      table: 'tags',
      field: 'name',
      resource: 'tags',
      path: () => `tags/${tagId}/?fields=id,name`,
      query: () => sandbox.spy(models.TagPublic, 'findOne'),
    },
    {
      name: 'pages browse',
      cached: false,
      table: 'posts',
      field: 'title',
      resource: 'pages',
      path: () => 'pages/?limit=all&fields=id,title&order=id%20asc',
      query: () => sandbox.spy(models.Post, 'findPage'),
    },
    {
      name: 'pages read',
      cached: false,
      table: 'posts',
      field: 'title',
      resource: 'pages',
      path: () => `pages/${pageId}/?fields=id,title`,
      query: () => sandbox.spy(models.Post, 'findOne'),
    },
  ];

  for (const endpoint of endpoints) {
    const contract = endpoint.cached ? 'caches until site.changed' : 'remains uncached';
    it(`${endpoint.name} ${contract}`, async function () {
      const query = endpoint.query();
      const path = endpoint.path();
      const { body: first } = await agent.get(path).expectStatus(200);
      assert.ok(first[endpoint.resource].length > 0);
      sinon.assert.calledOnce(query);

      const original = first[endpoint.resource][0];
      const updatedValue = `${original[endpoint.field]} updated`;
      // Bypass model events to separate a cache hit from invalidation. The
      // normal mutation path emits site.changed; we emit it explicitly below.
      await db
        .knex(endpoint.table)
        .where({ id: original.id })
        .update({
          [endpoint.field]: updatedValue,
        });

      try {
        const { body: second } = await agent.get(path).expectStatus(200);
        if (endpoint.cached) {
          assert.deepEqual(second, first);
          sinon.assert.calledOnce(query);

          const narrowedPath = path.replace(`fields=id,${endpoint.field}`, 'fields=id');
          const { body: narrowed } = await agent.get(narrowedPath).expectStatus(200);
          assert.equal(narrowed[endpoint.resource][0].id, original.id);
          assert.equal(narrowed[endpoint.resource][0][endpoint.field], undefined);
          sinon.assert.calledTwice(query);

          events.emit('site.changed');
          const { body: refreshed } = await agent.get(path).expectStatus(200);
          assert.equal(refreshed[endpoint.resource][0][endpoint.field], updatedValue);
          sinon.assert.calledThrice(query);
        } else {
          assert.equal(second[endpoint.resource][0][endpoint.field], updatedValue);
          sinon.assert.calledTwice(query);
        }
      } finally {
        await db
          .knex(endpoint.table)
          .where({ id: original.id })
          .update({
            [endpoint.field]: original[endpoint.field],
          });
        events.emit('site.changed');
      }
    });
  }
});
