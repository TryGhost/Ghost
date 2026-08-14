const assert = require('node:assert/strict');
const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const db = require('../../../core/server/data/db');

// These two tests inspect raw sqlite query traffic (db.knex.client as an sqlite3
// Database), so they only apply on the sqlite leg. Decide at registration from
// NODE_ENV (the mysql leg sets testing-mysql) — db.knex isn't connected yet when
// the file loads, and Vitest has no Mocha-style runtime this.skip().
const isMySQL = (process.env.NODE_ENV || '').includes('mysql');

describe('Collection Model', function () {
    beforeAll(testUtils.teardownDb);
    beforeAll(testUtils.stopGhost);
    afterAll(testUtils.teardownDb);

    // This is required for the models to be initialised ???
    // @TODO remove this once we have a better way of initialising models
    beforeAll(testUtils.setup('users:roles', 'posts'));

    describe('add', function () {
        it.skipIf(isMySQL)('does not update the sort_order of the collections_posts table if the type is "automatic"', async function () {
            /** @type {import('sqlite3').Database} */
            const database = db.knex.client;

            let didUpdateCollectionPosts = false;

            function handler(/** @type {{sql: string}} */ query) {
                if (query.sql.toLowerCase().includes('update `collections_posts` set `sort_order`')) {
                    didUpdateCollectionPosts = true;
                }
            }

            const posts = await models.Post.findAll();

            database.on('query', handler);

            await models.Collection.add({
                title: 'Test Collection',
                slug: 'test-collection-automatic',
                description: 'Test description',
                type: 'automatic',
                filter: 'featured:true',
                posts: posts.toJSON().map(post => ({id: post.id})),
                feature_image: null
            });

            database.off('query', handler);

            const actual = didUpdateCollectionPosts;
            const expected = false;

            assert.equal(actual, expected, 'collections_posts should not have been updated');
        });

        it.skipIf(isMySQL)('does update the sort_order of the collections_posts table if the type is "manual"', async function () {
            /** @type {import('sqlite3').Database} */
            const database = db.knex.client;

            let didUpdateCollectionPosts = false;

            function handler(/** @type {{sql: string}} */ query) {
                if (query.sql.toLowerCase().includes('update `collections_posts` set `sort_order`')) {
                    didUpdateCollectionPosts = true;
                }
            }

            const posts = await models.Post.findAll();

            database.on('query', handler);

            await models.Collection.add({
                title: 'Test Collection',
                slug: 'test-collection-manual',
                description: 'Test description',
                type: 'manual',
                filter: null,
                posts: posts.toJSON().map(post => ({id: post.id})),
                feature_image: null
            });

            database.off('query', handler);

            const actual = didUpdateCollectionPosts;
            const expected = true;

            assert.equal(actual, expected, 'collections_posts should not have been updated');
        });
    });
});
