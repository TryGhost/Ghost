const logging = require('@tryghost/logging');
const DatabaseInfo = require('@tryghost/database-info');
const {createNonTransactionalMigration} = require('../../utils');

const BATCH_SIZE = 5000;

/**
 * MySQL fast path: rewrites the geolocation JSON entirely inside the database
 * using MySQL's native JSON functions. Non-transactional and batched so an
 * interrupted migration resumes safely without redoing completed work.
 *
 * @param {import('knex').Knex} knex
 */
async function stripGeolocationPiiMySQL(knex) {
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
}

/**
 * SQLite fallback path: SQLite lacks the JSON manipulation functions the MySQL
 * path relies on, so we read each batch of rows, strip the PII in JS and write
 * the cleaned JSON back. This is slower than the MySQL path, but SQLite is only
 * used for development and very small sites where the row count is negligible.
 *
 * Mirrors the MySQL path's behaviour: only rows that still contain an `ip`
 * field are rewritten (so re-runs stay cheap and idempotent), rows with invalid
 * JSON are skipped, and the result keeps only country, country_code and region.
 *
 * @param {import('knex').Knex} knex
 */
async function stripGeolocationPiiSQLite(knex) {
    let totalUpdated = 0;
    let invalidCount = 0;
    // Cursor over the string primary key. Pagination by id visits every row
    // exactly once, even though we rewrite the geolocation column in place.
    let lastId = '';

    // eslint-disable-next-line no-constant-condition, no-restricted-syntax
    while (true) {
        const rows = await knex('members')
            .select('id', 'geolocation')
            .whereNotNull('geolocation')
            .andWhere('id', '>', lastId)
            .orderBy('id', 'asc')
            .limit(BATCH_SIZE);

        if (!rows.length) {
            break;
        }

        lastId = rows[rows.length - 1].id;

        const updates = rows.map((row) => {
            let parsed;

            try {
                parsed = JSON.parse(row.geolocation);
            } catch (err) {
                invalidCount += 1;
                return null;
            }

            // Skip rows without PII: already cleaned, or no IP was ever stored.
            // Matches the MySQL path's `$.ip IS NOT NULL` guard.
            if (!parsed || typeof parsed !== 'object' || parsed.ip === undefined) {
                return null;
            }

            return {
                id: row.id,
                geolocation: JSON.stringify({
                    country: parsed.country ?? null,
                    country_code: parsed.country_code ?? null,
                    region: parsed.region ?? null
                })
            };
        }).filter(Boolean);

        // SQLite allows only a single writer, so updates are applied sequentially.
        // eslint-disable-next-line no-restricted-syntax
        for (const update of updates) {
            await knex('members')
                .where('id', update.id)
                .update({geolocation: update.geolocation});
        }

        totalUpdated += updates.length;

        if (updates.length > 0) {
            logging.info(`Stripped PII from ${totalUpdated} member geolocation records so far`);
        }
    }

    if (invalidCount > 0) {
        logging.warn(`Skipping ${invalidCount} members with invalid geolocation JSON`);
    }

    if (totalUpdated === 0) {
        logging.info('No members with PII in geolocation data found - skipping');
    } else {
        logging.info(`Stripped PII from member geolocation data: ${totalUpdated} rows updated`);
    }
}

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        if (DatabaseInfo.isMySQL(knex)) {
            await stripGeolocationPiiMySQL(knex);
        } else {
            await stripGeolocationPiiSQLite(knex);
        }
    },
    async function down() {
        // This migration removes data that was unnecessarily stored (IP addresses,
        // coordinates, ASN, etc). The stripped fields cannot be restored.
        logging.warn('Rollback not possible: stripped geolocation fields cannot be restored');
    }
);
