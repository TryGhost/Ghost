const {createTransactionalMigration} = require('../../utils');
const logging = require('@tryghost/logging');

module.exports = createTransactionalMigration(
    async function up(knex) {
        // On very large sites this backfill can be run manually ahead of the
        // deploy (e.g. via the Stats-Service) so the boot-blocking migration
        // doesn't have to do the expensive scan+sort. If the table is already
        // populated — by such a pre-run, or a previous run of this migration —
        // verify and no-op, so re-running is safe and cheap.
        const alreadyPopulated = await knex('members_current_subscription').first();
        if (alreadyPopulated) {
            logging.warn('members_current_subscription already populated, skipping backfill');
            return;
        }

        logging.info('Backfilling members_current_subscription');

        const result = await knex.raw(`
            INSERT INTO members_current_subscription (member_id, subscription_id)
            SELECT member_id, subscription_id
            FROM members_resolved_subscription
        `);

        // MySQL returns [ResultSetHeader, ...], SQLite returns result directly
        const count = Array.isArray(result) ? result[0]?.affectedRows : result?.changes;
        logging.info(`Backfilled ${count ?? 'unknown number of'} rows into members_current_subscription`);
    },
    async function down(knex) {
        logging.info('Clearing members_current_subscription');
        await knex('members_current_subscription').del();
    }
);
