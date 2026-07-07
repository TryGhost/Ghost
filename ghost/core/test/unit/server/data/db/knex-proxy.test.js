const assert = require('node:assert/strict');
const {createKnexProxy} = require('../../../../../core/server/data/db/knex-proxy');
const createConnection = require('../../../../../core/server/data/db/create-connection');
const createBookshelf = require('../../../../../core/server/models/base/create-bookshelf');

describe('knex proxy', function () {
    const createKnex = () => createConnection({
        client: 'better-sqlite3',
        connection: {filename: ':memory:'}
    });

    it('forwards calls and property access to the currently resolved knex', async function () {
        const knexA = createKnex();
        const knexB = createKnex();
        let current = knexA;
        const proxy = createKnexProxy(() => current);

        try {
            await proxy.raw('create table t (x integer)');
            await proxy('t').insert({x: 1});

            current = knexB;
            await proxy.raw('create table t (x integer)');
            const rows = await proxy('t').select('x');
            assert.equal(rows.length, 0);

            current = knexA;
            const rowsA = await proxy('t').select('x');
            assert.equal(rowsA.length, 1);
        } finally {
            await knexA.destroy();
            await knexB.destroy();
        }
    });

    it('lets a bookshelf built on the proxy follow the resolution', async function () {
        const knexA = createKnex();
        const knexB = createKnex();
        let current = knexA;
        const proxy = createKnexProxy(() => current);
        const bookshelf = createBookshelf(proxy);

        const Widget = bookshelf.Model.extend({tableName: 'benefits'});

        try {
            await knexA.raw('create table benefits (id text primary key, name text, slug text, created_at datetime, updated_at datetime)');
            await knexB.raw('create table benefits (id text primary key, name text, slug text, created_at datetime, updated_at datetime)');

            await Widget.forge({id: '646464646464646464646464', name: 'on-a', slug: 'on-a'}).save(null, {method: 'insert', context: {internal: true}});

            current = knexB;
            const onB = await Widget.fetchAll();
            assert.equal(onB.length, 0);

            current = knexA;
            const onA = await Widget.fetchAll();
            assert.equal(onA.length, 1);
        } finally {
            await knexA.destroy();
            await knexB.destroy();
        }
    });
});
