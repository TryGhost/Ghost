const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

const SOURCE_TABLE = 'welcome_email_automated_emails';
const TARGET_TABLE = 'email_design_settings';
const SENDER_FIELDS = ['sender_name', 'sender_email', 'sender_reply_to'];

module.exports = createTransactionalMigration(
    async function up(knex) {
        const rows = await knex(SOURCE_TABLE)
            .select(['id', 'email_design_setting_id', ...SENDER_FIELDS])
            .whereNotNull('sender_name')
            .orWhereNotNull('sender_email')
            .orWhereNotNull('sender_reply_to');

        if (!rows.length) {
            logging.info('No welcome email sender details found to backfill');
            return;
        }

        logging.info(`Backfilling welcome email sender details for ${rows.length} rows`);

        // Only 2 rows exist (free + paid welcome emails), so sequential iteration is fine
        // eslint-disable-next-line no-restricted-syntax
        for (const row of rows) {
            const existingSettings = await knex(TARGET_TABLE)
                .where({id: row.email_design_setting_id})
                .first(['id', ...SENDER_FIELDS]);

            if (!existingSettings) {
                logging.warn(`Skipping welcome email ${row.id} sender details backfill - email design settings row ${row.email_design_setting_id} does not exist`);
                continue;
            }

            const attrs = SENDER_FIELDS.reduce((memo, field) => {
                if (existingSettings[field] === null && row[field] !== null) {
                    memo[field] = row[field];
                }

                return memo;
            }, {});

            if (!Object.keys(attrs).length) {
                logging.info(`Skipping welcome email ${row.id} sender details backfill - no missing sender details to copy`);
                continue;
            }

            logging.info(`Backfilling welcome email ${row.id} sender details to email design settings row ${row.email_design_setting_id}`);

            await knex(TARGET_TABLE)
                .where({id: row.email_design_setting_id})
                .update(attrs);
        }
    },

    async function down() {
        logging.info('Skipping rollback for welcome email sender details backfill');
    }
);
