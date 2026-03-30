const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

const TABLE_NAME = 'automated_emails';
const COLUMN_NAME = 'email_design_setting_id';
const DEFAULT_SLUG = 'default-automated-email';

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        const hasColumn = await knex.schema.hasColumn(TABLE_NAME, COLUMN_NAME);

        if (hasColumn) {
            logging.warn(`Adding column ${TABLE_NAME}.${COLUMN_NAME} — skipping as column already exists`);
            return;
        }

        // Look up the default email_design_settings row's ID
        const defaultRow = await knex('email_design_settings').where({slug: DEFAULT_SLUG}).first();

        if (!defaultRow) {
            logging.error(`Default email_design_settings row with slug "${DEFAULT_SLUG}" not found — cannot add ${TABLE_NAME}.${COLUMN_NAME}`);
            throw new Error(`Default email_design_settings row with slug "${DEFAULT_SLUG}" not found`);
        }

        logging.info(`Adding column ${TABLE_NAME}.${COLUMN_NAME} with default ${defaultRow.id}`);

        await knex.schema.table(TABLE_NAME, function (table) {
            table.string(COLUMN_NAME, 24)
                .notNullable()
                .defaultTo(defaultRow.id)
                .references('email_design_settings.id');
        });
    },
    async function down(knex) {
        const hasColumn = await knex.schema.hasColumn(TABLE_NAME, COLUMN_NAME);

        if (!hasColumn) {
            logging.warn(`Removing column ${TABLE_NAME}.${COLUMN_NAME} — skipping as column does not exist`);
            return;
        }

        logging.info(`Removing column ${TABLE_NAME}.${COLUMN_NAME}`);

        await knex.schema.table(TABLE_NAME, function (table) {
            table.dropForeign(COLUMN_NAME);
        });

        await knex.schema.table(TABLE_NAME, function (table) {
            table.dropColumn(COLUMN_NAME);
        });
    }
);
