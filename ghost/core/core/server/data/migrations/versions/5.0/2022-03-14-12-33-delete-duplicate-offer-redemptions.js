const DatabaseInfo = require('@tryghost/database-info/lib/database-info');
const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        if (DatabaseInfo.isSQLite(knex)) {
            const duplicates = await knex('offer_redemptions')
                .select('subscription_id')
                .count('subscription_id as count')
                .groupBy('subscription_id')
                .having('count', '>', 1);

            logging.info(`Deleting all offer redemptions which have duplicates`);
            await knex('offer_redemptions')
                .whereIn('subscription_id', duplicates.map(row => row.subscription_id))
                .del();
            return;
        }
        const result = await knex.raw(`
            DELETE
                duplicate_redemptions
            FROM
                offer_redemptions AS duplicate_redemptions,
                offer_redemptions
            WHERE
                duplicate_redemptions.subscription_id = offer_redemptions.subscription_id
            AND
                duplicate_redemptions.created_at < offer_redemptions.created_at
        `);

        logging.info(`Deleted ${result[0].affectedRows} duplicate offer redemptions`);
    },
    async function down() {}
);
