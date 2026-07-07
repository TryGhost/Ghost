const assert = require('node:assert/strict');
const createBookshelf = require('../../../../../core/server/models/base/create-bookshelf');
const createConnection = require('../../../../../core/server/data/db/create-connection');

describe('createBookshelf', function () {
    const createKnex = () => createConnection({
        client: 'better-sqlite3',
        connection: {filename: ':memory:'}
    });

    it('builds a bookshelf bound to the given knex with the Ghost base model', async function () {
        const knex = createKnex();
        try {
            const ghostBookshelf = createBookshelf(knex);

            assert.equal(ghostBookshelf.knex, knex);
            assert.equal(ghostBookshelf.Model.prototype.hasTimestamps, true);
            assert.equal(typeof ghostBookshelf.Model.transaction, 'function');
            assert.equal(typeof ghostBookshelf.Model.findPage, 'function');
        } finally {
            await knex.destroy();
        }
    });

    it('builds independent instances with independent model registries', async function () {
        const knexA = createKnex();
        const knexB = createKnex();
        try {
            const bookshelfA = createBookshelf(knexA);
            const bookshelfB = createBookshelf(knexB);

            bookshelfA.model('Widget', bookshelfA.Model.extend({tableName: 'widgets'}));

            assert.ok(bookshelfA.model('Widget'));
            assert.equal(bookshelfB.model('Widget'), undefined);
        } finally {
            await knexA.destroy();
            await knexB.destroy();
        }
    });

    it('runs transactions on its own connection', async function () {
        const knex = createKnex();
        try {
            const ghostBookshelf = createBookshelf(knex);
            await knex.raw('create table things (x integer)');

            await ghostBookshelf.Model.transaction(async (transacting) => {
                await transacting('things').insert({x: 1});
            });

            const rows = await knex('things').select('x');
            assert.equal(rows[0].x, 1);
        } finally {
            await knex.destroy();
        }
    });
});
