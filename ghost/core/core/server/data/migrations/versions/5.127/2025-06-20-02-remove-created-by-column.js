const logging = require('@tryghost/logging');

const TABLES_WITH_CREATED_BY = [
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
    'snippets',
    'tokens'
];

module.exports = {
    async up(knex) {
        logging.info('Dropping created_by column from all tables');

        for (const tableName of TABLES_WITH_CREATED_BY) {
            try {
                // First check if the column exists
                const hasColumn = await knex.schema.hasColumn(tableName, 'created_by');
                
                if (!hasColumn) {
                    logging.info(`Table ${tableName} does not have created_by column, skipping`);
                    continue;
                }

                // If the database is MySQL, we need to handle foreign key constraints
                const isMysql = knex.client.config.client === 'mysql' || knex.client.config.client === 'mysql2';
                
                if (isMysql && tableName === 'posts') {
                    // Posts has a foreign key constraint on created_by that references users
                    logging.info(`Dropping foreign key constraint on ${tableName}.created_by`);
                    
                    try {
                        await knex.raw(`ALTER TABLE ${tableName} DROP FOREIGN KEY posts_created_by_foreign`);
                    } catch (err) {
                        // Foreign key might not exist in all installations
                        logging.warn(`Foreign key posts_created_by_foreign not found: ${err.message}`);
                    }
                }

                // Drop the column
                logging.info(`Dropping created_by column from ${tableName}`);
                await knex.schema.table(tableName, function (table) {
                    table.dropColumn('created_by');
                });
                
                logging.info(`Successfully dropped created_by column from ${tableName}`);
            } catch (err) {
                logging.error(`Failed to drop created_by column from ${tableName}: ${err.message}`);
                throw err;
            }
        }
    },

    async down() {
        logging.warn('Reverting removal of created_by column is not supported');
    }
};