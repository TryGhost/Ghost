const assert = require('assert/strict');
const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const db = require('../../../core/server/data/db');

describe('Collection Model', function () {
    before(testUtils.teardownDb);
    before(testUtils.stopGhost);
    after(testUtils.teardownDb);

    // This is required for the models to be initialised ???
    // @TODO remove this once we have a better way of initialising models
    before(testUtils.setup('users:roles', 'posts'));

    describe('add', function () {
        it('does not update the sort_order of the collections_posts table if the type is "automatic"', async function () {
            if (db?.knex?.client?.config?.client !== 'sqlite3') {
                return this.skip();
            }
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

        it('does update the sort_order of the collections_posts table if the type is "manual"', async function () {
            if (db?.knex?.client?.config?.client !== 'sqlite3') {
                return this.skip();
            }
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
