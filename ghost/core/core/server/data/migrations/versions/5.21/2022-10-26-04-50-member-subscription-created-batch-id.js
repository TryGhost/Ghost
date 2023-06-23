const _ = require('lodash');
const logging = require('@tryghost/logging');
const ObjectId = require('bson-objectid').default;
const {createTransactionalMigration} = require('../../utils');
const DatabaseInfo = require('@tryghost/database-info');
const GhostError = require('@tryghost/errors').GhostError;

// This migration links together members_created_events and members_subscription_created_events

module.exports = createTransactionalMigration(
    async function up(knex) {
        if (DatabaseInfo.isSQLite(knex)) {
            logging.info('Skipped linking members_created_events and members_subscription_created_events on SQLite');
            return;
        }

        // All events that happened within 15 minutes of each other will be linked
        const rows = await knex('members_created_events as m')
            .select('m.id as m_id', 's.id as s_id', 'm.member_id as member_id', 's.subscription_id as subscription_id')
            .join('members_subscription_created_events AS s', 's.member_id', 'm.member_id')
            .whereRaw('TIMESTAMPDIFF(MINUTE, s.created_at, m.created_at) between -15 and 15');

        if (!rows.length) {
            logging.info('Did not find linkable members_created_events and members_subscription_created_events');
            return;
        }

        // Attach a unique id to each row
        for (const row of rows) { // eslint-disable-line no-restricted-syntax
            row.batch_id = ObjectId().toHexString();
        }

        // Create batches (insertBatch doesn't support the onConflict option)
        const batches = _.chunk(rows, 1000);
    
        for (const batch of batches) { // eslint-disable-line no-restricted-syntax
            // Update the members_created_events table using INSERT ON DUPLICATE KEY UPDATE trick
            const response1 = await knex('members_created_events').insert(batch.map((r) => {
                return {
                    id: r.m_id,
                    batch_id: r.batch_id,
                    member_id: r.member_id, // added to make the insert work
                    source: '', // added to make the insert work
                    created_at: knex.raw('NOW()') // added to make the insert work
                };
            })).onConflict('id').merge(['batch_id']);

            if (response1[0] !== 0) {
                logging.error(`Inserted ${response1[0]} members_created_events, expected 0`);
                throw new GhostError({
                    message: 'Rolling back'
                });
            }

            const response2 = await knex('members_subscription_created_events').insert(batch.map((r) => {
                return {
                    id: r.s_id,
                    batch_id: r.batch_id,
                    member_id: r.member_id, // added to make the insert work
                    subscription_id: r.subscription_id, // added to make the insert work
                    created_at: knex.raw('NOW()') // added to make the insert work
                };
            })).onConflict('id').merge(['batch_id']);

            if (response2[0] !== 0) {
                logging.error(`Inserted ${response1[0]} members_subscription_created_events, expected 0`);
                throw new GhostError({
                    message: 'Rolling back'
                });
            }
        }
        logging.info(`Linked ${rows.length} members_created_events and members_subscription_created_events`);
    },
    async function down() {
        // noop
    }
);
