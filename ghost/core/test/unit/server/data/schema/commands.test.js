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

    describe('createViewOrReplace', function () {
        // Guards the portability fix: views must never be created with MySQL's
        // default DEFINER security, which binds them to the migrating account
        // and breaks when a backup is restored under a different MySQL user.
        it('creates the view with SQL SECURITY INVOKER on MySQL', async function () {
            const rawStatements = [];
            const fakeKnex = {
                client: {config: {client: 'mysql2'}},
                raw: (sql) => {
                    rawStatements.push(sql);
                    return Promise.resolve();
                }
            };

            await commands.createViewOrReplace('my_view', 'SELECT 1 AS one', fakeKnex);

            assert.equal(rawStatements.length, 1);
            assert.match(rawStatements[0], /CREATE OR REPLACE SQL SECURITY INVOKER VIEW/);
            assert.match(rawStatements[0], /`my_view`/);
            assert.doesNotMatch(rawStatements[0], /DEFINER/);
        });

        it('uses the plain builder (no security clause) on SQLite', async function () {
            const builderViews = [];
            const fakeKnex = {
                client: {config: {client: 'sqlite3'}},
                raw: sql => sql,
                schema: {
                    createViewOrReplace: (name) => {
                        builderViews.push(name);
                        return Promise.resolve();
                    }
                }
            };

            await commands.createViewOrReplace('my_view', 'SELECT 1 AS one', fakeKnex);

            assert.deepEqual(builderViews, ['my_view']);
        });
    });
});
