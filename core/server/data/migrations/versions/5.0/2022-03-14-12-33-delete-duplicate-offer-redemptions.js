const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const result = await knex.raw(`
            DELETE
                duplicate_redemptions
            FROM
                offer_redemptions duplicate_redemptions,
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
