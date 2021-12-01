const should = require('should');
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
            should.fail('addForeign did not throw');
        } catch (err) {
            should.equal(errors.utils.isGhostError(err), true);
            err.message.should.equal('Must use hasForeignSQLite3 on an SQLite3 database');
        }
    });

    it('_hasPrimaryKeySQLite throws when knex is configured to use sqlite', async function () {
        const Knex = require('knex');
        const knex = Knex({
            client: 'mysql'
        });

        try {
            await commands._hasPrimaryKeySQLite(null, knex);
            should.fail('hasPrimaryKeySQLite did not throw');
        } catch (err) {
            should.equal(errors.utils.isGhostError(err), true);
            err.message.should.equal('Must use hasPrimaryKeySQLite on an SQLite3 database');
        }
    });
});
