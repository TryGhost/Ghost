const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

/**
 * @param {(val: string) => boolean} exists
 * @param {string} requested
 * @param {string} attempt
 * @param {number} n
 *
 * @returns {string}
 */
function getUnique(exists, requested, attempt = requested, n = 1) {
    if (!exists(attempt)) {
        return attempt;
    }
    const newAttempt = requested.slice(0, -n.toString().length) + n;
    return getUnique(exists, requested, newAttempt, n + 1);
}

module.exports = createTransactionalMigration(
    async function up(knex) {
        const allOffers = await knex
            .select('id', 'name')
            .from('offers');

        const offersNeedingTrunctation = allOffers.filter((row) => {
            return row.name.length >= 40;
        });

        if (offersNeedingTrunctation.length === 0) {
            logging.warn('No Offers found needing truncation');
            return;
        } else {
            logging.info(`Found ${offersNeedingTrunctation.length} Offers needing truncation`);
        }

        const truncatedOffers = offersNeedingTrunctation.reduce((offers, row) => {
            function exists(name) {
                return offers.find(offer => offer.name === name) !== undefined;
            }

            const updatedRow = {
                id: row.id,
                name: getUnique(exists, row.name.slice(0, 40))
            };

            return offers.concat(updatedRow);
        }, []);

        // eslint-disable-next-line no-restricted-syntax
        for (const truncatedOffer of truncatedOffers) {
            await knex('offers')
                .update('name', truncatedOffer.name)
                .where('id', truncatedOffer.id);
        }
    },
    // no-op we've lost the data required to roll this back
    async function down() {}
);
