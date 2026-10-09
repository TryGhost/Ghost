const assert = require('node:assert/strict');
const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const db = require('../../../core/server/data/db');

describe('Collection Model', function () {
  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.stopGhost);
  afterAll(testUtils.teardownDb);

  // This is required for the models to be initialised ???
  // @TODO remove this once we have a better way of initialising models
  beforeAll(testUtils.setup('users:roles', 'posts'));

  describe('add', function () {
    it('does not update the sort_order of the collections_posts table if the type is "automatic"', async function () {
      /** @type {import('knex').Knex.Client} */
      const database = db.knex.client;

      let didUpdateCollectionPosts = false;

      function handler(/** @type {{sql: string}} */ query) {
        if (query.sql.toLowerCase().includes('update `collections_posts` set `sort_order`')) {
          didUpdateCollectionPosts = true;
        }
      }

      const posts = await models.Post.findAll();

      database.on('query', handler);
      try {
        await models.Collection.add({
          title: 'Test Collection',
          slug: 'test-collection-automatic',
          description: 'Test description',
          type: 'automatic',
          filter: 'featured:true',
          posts: posts.toJSON().map((post) => ({ id: post.id })),
          feature_image: null,
        });
      } finally {
        database.off('query', handler);
      }

      assert.equal(
        didUpdateCollectionPosts,
        false,
        'collections_posts should not have been updated',
      );
    });

    it('does update the sort_order of the collections_posts table if the type is "manual"', async function () {
      /** @type {import('knex').Knex.Client} */
      const database = db.knex.client;

      let didUpdateCollectionPosts = false;

      function handler(/** @type {{sql: string}} */ query) {
        if (query.sql.toLowerCase().includes('update `collections_posts` set `sort_order`')) {
          didUpdateCollectionPosts = true;
        }
      }

      const posts = await models.Post.findAll();

      database.on('query', handler);
      try {
        await models.Collection.add({
          title: 'Test Collection',
          slug: 'test-collection-manual',
          description: 'Test description',
          type: 'manual',
          filter: null,
          posts: posts.toJSON().map((post) => ({ id: post.id })),
          feature_image: null,
        });
      } finally {
        database.off('query', handler);
      }

      assert.equal(didUpdateCollectionPosts, true, 'collections_posts should have been updated');
    });
  });
});
