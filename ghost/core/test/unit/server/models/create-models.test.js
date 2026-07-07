const assert = require('node:assert/strict');
const createModels = require('../../../../core/server/models/create-models');
const createBookshelf = require('../../../../core/server/models/base/create-bookshelf');
const createConnection = require('../../../../core/server/data/db/create-connection');

describe('createModels', function () {
    const createKnex = () => createConnection({
        client: 'better-sqlite3',
        connection: {filename: ':memory:'}
    });

    it('registers the full model graph on the given bookshelf', async function () {
        const knex = createKnex();
        try {
            const ghostBookshelf = createBookshelf(knex);
            const models = createModels(ghostBookshelf);

            assert.equal(models.Base, ghostBookshelf);
            for (const name of ['Post', 'User', 'Tag', 'Author', 'TagPublic', 'Member', 'Settings', 'ApiKey']) {
                assert.ok(models[name], `expected ${name} to be registered`);
                assert.equal(models[name], ghostBookshelf.model(name));
            }
        } finally {
            await knex.destroy();
        }
    });

    it('builds independent model graphs per bookshelf', async function () {
        const knexA = createKnex();
        const knexB = createKnex();
        try {
            const modelsA = createModels(createBookshelf(knexA));
            const modelsB = createModels(createBookshelf(knexB));

            assert.notEqual(modelsA.Post, modelsB.Post);
            assert.equal(modelsA.Base.knex, knexA);
            assert.equal(modelsB.Base.knex, knexB);
        } finally {
            await knexA.destroy();
            await knexB.destroy();
        }
    });
});
