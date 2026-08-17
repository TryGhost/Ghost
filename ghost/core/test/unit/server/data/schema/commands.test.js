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

    describe('addTableColumn', function () {
        // addTableColumn isn't exported, so we exercise it through createTable
        // and stringify the builder rather than running it against a database.
        function ddlFor(client, tableSpec) {
            const Knex = require('knex');
            const knex = Knex({client, useNullAsDefault: true});

            try {
                return commands.createTable('test_table', knex, tableSpec).toString();
            } finally {
                knex.destroy();
            }
        }

        it('gives a binary column with a maxlength a bounded varbinary type on MySQL', function () {
            const ddl = ddlFor('mysql2', {
                to_hash: {type: 'binary', maxlength: 32, nullable: true}
            });

            assert.match(ddl, /`to_hash` varbinary\(32\)/);
        });

        // The bounded type is what makes the column indexable in full: MySQL
        // can only index an unbounded blob with a prefix, and a prefix on a
        // UNIQUE index would enforce uniqueness over the prefix alone.
        it('falls back to an unbounded blob when a binary column has no maxlength', function () {
            const ddl = ddlFor('mysql2', {
                to_hash: {type: 'binary', nullable: true}
            });

            assert.match(ddl, /`to_hash` blob/);
        });

        it('indexes the whole binary column in a unique constraint, without a prefix', function () {
            const ddl = ddlFor('mysql2', {
                owner_id: {type: 'string', maxlength: 24, nullable: true},
                to_hash: {type: 'binary', maxlength: 32, nullable: true},
                '@@UNIQUE_CONSTRAINTS@@': [['owner_id', 'to_hash']]
            });

            // The column has to be bounded for this to be legal: MySQL rejects
            // an unbounded blob in a key without a prefix length (ER_BLOB_KEY_WITHOUT_LENGTH).
            assert.match(ddl, /`to_hash` varbinary\(32\)/);
            assert.match(ddl, /add unique `test_table_owner_id_to_hash_unique`\(`owner_id`, `to_hash`\)/);
        });

        it('uses blob for binary columns on SQLite, which has no bounded binary type', function () {
            const ddl = ddlFor('better-sqlite3', {
                to_hash: {type: 'binary', maxlength: 32, nullable: true}
            });

            assert.match(ddl, /`to_hash` blob/);
        });

        it('still applies maxlength to string columns, defaulting to 191', function () {
            const ddl = ddlFor('mysql2', {
                bounded: {type: 'string', maxlength: 50, nullable: true},
                unbounded: {type: 'string', nullable: true}
            });

            assert.match(ddl, /`bounded` varchar\(50\)/);
            assert.match(ddl, /`unbounded` varchar\(191\)/);
        });
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
