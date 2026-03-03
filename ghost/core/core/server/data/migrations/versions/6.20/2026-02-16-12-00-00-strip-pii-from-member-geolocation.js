const logging = require('@tryghost/logging');
const _ = require('lodash');
const {createTransactionalMigration} = require('../../utils');

const ALLOWED_KEYS = new Set(['country', 'country_code', 'region']);

module.exports = createTransactionalMigration(
    async function up(knex) {
        const rows = await knex('members')
            .select('id', 'geolocation')
            .whereNotNull('geolocation');

        if (!rows.length) {
            logging.info('No members with geolocation data found - skipping');
            return;
        }

        const updates = [];

        // eslint-disable-next-line no-restricted-syntax
        for (const row of rows) {
            let data;
            try {
                data = JSON.parse(row.geolocation);
            } catch (e) {
                logging.warn(`Skipping member ${row.id}: invalid geolocation JSON`);
                continue;
            }

            // Skip rows that only contain the allowed keys
            if (Object.keys(data).every(key => ALLOWED_KEYS.has(key))) {
                continue;
            }

            updates.push({
                id: row.id,
                geolocation: JSON.stringify({
                    country: data.country || null,
                    country_code: data.country_code || null,
                    region: data.region || null
                })
            });
        }

        if (!updates.length) {
            logging.info(`All ${rows.length} members already have clean geolocation data - skipping`);
            return;
        }

        logging.info(`Stripping PII from ${updates.length} member geolocation records`);

        const batches = _.chunk(updates, 1000);
        // eslint-disable-next-line no-restricted-syntax
        for (const batch of batches) {
            await Promise.all(batch.map(row => knex('members').update('geolocation', row.geolocation).where('id', row.id)));
        }

        logging.info(`Stripped PII from member geolocation data: ${updates.length} rows updated`);
    },
    async function down() {
        // This migration removes data that was unnecessarily stored (IP addresses,
        // coordinates, ASN, etc). The stripped fields cannot be restored.
        logging.warn('Rollback not possible: stripped geolocation fields cannot be restored');
    }
);
