const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const DatabaseInfo = require('@tryghost/database-info');

module.exports = createTransactionalMigration(
    async function up(knex) {
        if (!DatabaseInfo.isMySQL(knex)) {
            logging.warn('Skipping cleanup of duplicate offer redemptions - database is not MySQL');
            return;
        }
        logging.info('Looking for duplicate offer redemptions.');

        const duplicates = await knex('offer_redemptions')
            .select('subscription_id')
            .count('subscription_id as count')
            .groupBy('subscription_id')
            .having('count', '>', 1);

        if (!duplicates.length) {
            logging.info('No duplicate offer redemptions found.');
            return;
        }

        logging.info(`Found ${duplicates.length} duplicate offer redemptions.`);

        // eslint-disable-next-line no-restricted-syntax
        for (const duplicate of duplicates) {
            const offerRedemptions = await knex('offer_redemptions')
                .select('id')
                .where('subscription_id', duplicate.subscription_id);

            const [offerRedemptionToKeep, ...offerRedemptionsToDelete] = offerRedemptions;

            logging.info(`Keeping offer redemption ${offerRedemptionToKeep.id}`);

            logging.info(`Deleting ${offerRedemptionsToDelete.length} duplicates`);
            await knex('offer_redemptions')
                .whereIn('id', offerRedemptionsToDelete.map(x => x.id))
                .del();
        }
    },
    async function down() {
        logging.warn('Not recreating duplicate offer redemptions');
        return;
    }
);
