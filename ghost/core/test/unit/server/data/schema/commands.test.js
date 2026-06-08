const assert = require('node:assert/strict');
const errors = require('@tryghost/errors');

const commands = require('../../../../../core/server/data/schema/commands');

describe('schema commands', function () {
    it('_hasForeignSQLite throws when knex is nox configured to use sqlite3', async function () {
        const Knex = require('knex');
        const knex = Knex({
            client: 'mysql'
        });

        try {
            await commands._hasForeignSQLite({transaction: knex});
            assert.fail('addForeign did not throw');
        } catch (err) {
            assert.equal(errors.utils.isGhostError(err), true);
            assert.equal(err.message, 'Must use hasForeignSQLite3 on an SQLite3 database');
        }
    });

    it('_hasPrimaryKeySQLite throws when knex is configured to use sqlite', async function () {
        const Knex = require('knex');
        const knex = Knex({
            client: 'mysql'
        });

        try {
            await commands._hasPrimaryKeySQLite(null, knex);
            assert.fail('hasPrimaryKeySQLite did not throw');
        } catch (err) {
            assert.equal(errors.utils.isGhostError(err), true);
            assert.equal(err.message, 'Must use hasPrimaryKeySQLite on an SQLite3 database');
        }
    });
});
