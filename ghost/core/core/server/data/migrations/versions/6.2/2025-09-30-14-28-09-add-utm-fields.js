const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

const tables = [
    'members_created_events',
    'members_subscription_created_events',
    'donation_payment_events'
];

const utmColumns = [
    {name: 'utm_source', definition: {type: 'string', maxlength: 191, nullable: true}},
    {name: 'utm_medium', definition: {type: 'string', maxlength: 191, nullable: true}},
    {name: 'utm_campaign', definition: {type: 'string', maxlength: 191, nullable: true}},
    {name: 'utm_term', definition: {type: 'string', maxlength: 191, nullable: true}},
    {name: 'utm_content', definition: {type: 'string', maxlength: 191, nullable: true}}
];

module.exports = createTransactionalMigration(
    async function up(knex) {
        // we should allow for loops because we want sequential execution
        // eslint-disable-next-line no-restricted-syntax
        for (const table of tables) {
            logging.info(`Adding UTM columns to ${table}`);

            // eslint-disable-next-line no-restricted-syntax
            for (const column of utmColumns) {
                const hasColumn = await knex.schema.hasColumn(table, column.name);
                if (!hasColumn) {
                    logging.info(`Adding column ${column.name} to ${table}`);
                    await knex.schema.table(table, function (t) {
                        t.string(column.name, column.definition.maxlength).nullable();
                    });
                } else {
                    logging.warn(`Column ${column.name} already exists in ${table} - skipping`);
                }
            }
        }
    },

    async function down(knex) {
        // we should allow for loops because we want sequential execution
        // eslint-disable-next-line no-restricted-syntax
        for (const table of tables) {
            logging.info(`Removing UTM columns from ${table}`);

            // eslint-disable-next-line no-restricted-syntax
            for (const column of utmColumns) {
                const hasColumn = await knex.schema.hasColumn(table, column.name);
                if (hasColumn) {
                    logging.info(`Dropping column ${column.name} from ${table}`);
                    await knex.schema.table(table, function (t) {
                        t.dropColumn(column.name);
                    });
                } else {
                    logging.warn(`Column ${column.name} does not exist in ${table} - skipping`);
                }
            }
        }
    }
);