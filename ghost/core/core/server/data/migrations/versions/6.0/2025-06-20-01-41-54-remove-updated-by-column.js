const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const DatabaseInfo = require('@tryghost/database-info');

// Tables that have the updated_by column
const TABLES_WITH_UPDATED_BY = [
    'posts',
    'users',
    'roles',
    'permissions',
    'settings',
    'tags',
    'invites',
    'integrations',
    'webhooks',
    'api_keys',
    'members',
    'labels',
    'members_stripe_customers',
    'members_stripe_customers_subscriptions',
    'emails',
    'snippets'
];

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Dropping updated_by column from all tables');

        for (const table of TABLES_WITH_UPDATED_BY) {
            const hasTable = await knex.schema.hasTable(table);
            if (!hasTable) {
                logging.warn(`Table ${table} does not exist - skipping`);
                continue;
            }

            const hasColumn = await knex.schema.hasColumn(table, 'updated_by');
            if (!hasColumn) {
                logging.warn(`Table ${table} does not have updated_by column - skipping`);
                continue;
            }

            logging.info(`Dropping updated_by column from ${table}`);

            // Handle foreign key constraints for MySQL
            if (DatabaseInfo.isMysql(knex)) {
                // Find and drop any foreign key constraints on updated_by
                const [dbName] = await knex.raw('SELECT DATABASE() as db');
                const database = dbName[0].db;

                const [constraints] = await knex.raw(`
                    SELECT CONSTRAINT_NAME
                    FROM information_schema.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = ?
                    AND TABLE_NAME = ?
                    AND COLUMN_NAME = 'updated_by'
                    AND REFERENCED_TABLE_NAME IS NOT NULL
                `, [database, table]);

                for (const constraint of constraints) {
                    logging.info(`Dropping foreign key constraint ${constraint.CONSTRAINT_NAME} from ${table}`);
                    await knex.raw(`ALTER TABLE ${table} DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}`);
                }
            }

            // Drop the column
            await knex.schema.alterTable(table, function (t) {
                t.dropColumn('updated_by');
            });

            logging.info(`Successfully dropped updated_by column from ${table}`);
        }
    },

    async function down() {
        // Major version migrations are not reversible
        logging.warn('Reverting removal of updated_by column is not supported');
    }
);