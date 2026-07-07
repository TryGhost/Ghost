const assert = require('node:assert/strict');
const createConnection = require('../../../../../core/server/data/db/create-connection');

describe('createConnection', function () {
    it('creates a working knex instance from a config object', async function () {
        const knex = createConnection({
            client: 'better-sqlite3',
            connection: {filename: ':memory:'}
        });

        try {
            const result = await knex.raw('select 1 as x');
            assert.equal(result[0].x, 1);
        } finally {
            await knex.destroy();
        }
    });

    it('creates independent instances per call', async function () {
        const configFor = () => ({
            client: 'better-sqlite3',
            connection: {filename: ':memory:'}
        });
        const knexA = createConnection(configFor());
        const knexB = createConnection(configFor());

        try {
            await knexA.raw('create table t (x integer)');
            await assert.rejects(knexB.raw('select * from t'));
        } finally {
            await knexA.destroy();
            await knexB.destroy();
        }
    });

    it('aliases sqlite3 to better-sqlite3', async function () {
        const knex = createConnection({
            client: 'sqlite3',
            connection: {filename: ':memory:'}
        });

        try {
            assert.equal(knex.client.config.client, 'better-sqlite3');
        } finally {
            await knex.destroy();
        }
    });

    it('applies mysql connection defaults', function () {
        const dbConfig = {
            client: 'mysql2',
            connection: {host: 'localhost', user: 'ghost', password: 'x', database: 'ghost'}
        };
        const knex = createConnection(dbConfig);

        assert.equal(knex.client.config.connection.timezone, 'Z');
        assert.equal(knex.client.config.connection.charset, 'utf8mb4');
        assert.equal(knex.client.config.connection.decimalNumbers, true);
    });
});
