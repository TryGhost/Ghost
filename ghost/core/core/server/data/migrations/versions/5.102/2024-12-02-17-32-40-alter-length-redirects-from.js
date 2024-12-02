// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const DatabaseInfo = require('@tryghost/database-info');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Altering length of redirects.from');
        // SQLite doesn't support altering column length
        if (DatabaseInfo.isSQLite(knex)) {
            logging.info('Creating temporary redirects table for SQLite');
            await knex.schema.createTable('redirects_temp', function (table) {
                table.string('id').primary();
                table.string('from', 191).notNullable();
                table.string('to', 2000).notNullable();
                table.string('post_id', 24).nullable();
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').nullable();
            });

            logging.info('Inserting data into temporary redirects table');
            await knex.raw(`
                INSERT INTO redirects_temp (id, from, to, post_id, created_at, updated_at)
                SELECT id, substr(from, 1, 20), to, post_id, created_at, updated_at FROM redirects
            `);

            logging.info('Dropping original redirects table');
            await knex.schema.dropTable('redirects');

            logging.info('Renaming temporary redirects table to redirects');
            await knex.schema.renameTable('redirects_temp', 'redirects');
        } else {
            await knex.schema.alterTable('redirects', function (table) {
                table.string('from', 191).notNullable().alter();
            });
        }
    },
    async function down(knex) {
        logging.info('Reverting length of redirects.from');
        // SQLite doesn't support altering column length
        if (DatabaseInfo.isSQLite(knex)) {
            logging.info('Creating temporary redirects table for SQLite');
            await knex.schema.createTable('redirects_temp', function (table) {
                table.string('id').primary();
                table.string('from', 191).notNullable();
                table.string('to', 2000).notNullable();
                table.string('post_id', 24).nullable();
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').nullable();
            });

            logging.info('Inserting data into temporary redirects table');
            await knex.raw(`
                INSERT INTO redirects_temp (id, from, to, post_id, created_at, updated_at)
                SELECT id, from, to, post_id, created_at, updated_at FROM redirects
            `);

            logging.info('Dropping original redirects table');
            await knex.schema.dropTable('redirects');

            logging.info('Renaming temporary redirects table to redirects');
            await knex.schema.renameTable('redirects_temp', 'redirects');
        } else {
            await knex.schema.alterTable('redirects', function (table) {
                table.string('from', 191).notNullable().alter();
            });
        }
    }
);