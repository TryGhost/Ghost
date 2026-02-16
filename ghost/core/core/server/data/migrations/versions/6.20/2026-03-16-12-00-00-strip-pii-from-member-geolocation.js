const logging = require('@tryghost/logging');
const DatabaseInfo = require('@tryghost/database-info');
const {createNonTransactionalMigration} = require('../../utils');

const BATCH_SIZE = 5000;

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        if (!DatabaseInfo.isMySQL(knex)) {
            logging.info('Skipping PII stripping on non-MySQL database');
            return;
        }

        let totalUpdated = 0;

        // Log any rows with invalid JSON so we know they were skipped
        const [[{invalidCount}]] = await knex.raw(`
            SELECT COUNT(*) AS invalidCount
            FROM members
            WHERE geolocation IS NOT NULL
              AND NOT JSON_VALID(geolocation)
        `);

        if (invalidCount > 0) {
            logging.warn(`Skipping ${invalidCount} members with invalid geolocation JSON`);
        }

        // Self-healing batch loop: select rows that still have PII ($.ip present),
        // update them, repeat. Already-cleaned rows won't match, so interrupted
        // migrations resume safely. JSON_VALID guard prevents ERROR 3141 on
        // corrupt JSON rows.
        // eslint-disable-next-line no-constant-condition, no-restricted-syntax
        while (true) {
            const [rows] = await knex.raw(`
                SELECT id FROM members
                WHERE geolocation IS NOT NULL
                  AND JSON_VALID(geolocation)
                  AND JSON_EXTRACT(geolocation, '$.ip') IS NOT NULL
                LIMIT ?
            `, [BATCH_SIZE]);

            if (!rows.length) {
                break;
            }

            const ids = rows.map(row => row.id);

            await knex.raw(`
                UPDATE members
                SET geolocation = JSON_OBJECT(
                    'country', JSON_UNQUOTE(JSON_EXTRACT(geolocation, '$.country')),
                    'country_code', JSON_UNQUOTE(JSON_EXTRACT(geolocation, '$.country_code')),
                    'region', JSON_UNQUOTE(JSON_EXTRACT(geolocation, '$.region'))
                )
                WHERE id IN (?)
            `, [ids]);

            totalUpdated += ids.length;
            logging.info(`Stripped PII from ${totalUpdated} member geolocation records so far`);
        }

        if (totalUpdated === 0) {
            logging.info('No members with PII in geolocation data found - skipping');
        } else {
            logging.info(`Stripped PII from member geolocation data: ${totalUpdated} rows updated`);
        }
    },
    async function down() {
        // This migration removes data that was unnecessarily stored (IP addresses,
        // coordinates, ASN, etc). The stripped fields cannot be restored.
        logging.warn('Rollback not possible: stripped geolocation fields cannot be restored');
    }
);
