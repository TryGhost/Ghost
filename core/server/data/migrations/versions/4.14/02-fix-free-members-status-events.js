const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils.js');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Updating members_status_events for free members');
        const freeMembers = await knex('members')
            .select('id')
            .where('status', 'free');

        if (freeMembers.length === 0) {
            logging.info('No free members found - skipping migration');
            return;
        } else {
            logging.info(`Found ${freeMembers.length} free members - checking members_status_events`);
        }

        for (const member of freeMembers) {
            const mostRecentStatusEvent = await knex('members_status_events')
                .select('*')
                .where('member_id', member.id)
                .orderBy('created_at', 'desc')
                .limit(1)
                .first();

            if (!mostRecentStatusEvent) {
                logging.warn(`Could not find a status event for member ${member.id} - skipping this member`);
            } else if (mostRecentStatusEvent.to_status !== 'free') {
                logging.info(`Updating members_status_event ${mostRecentStatusEvent.id}`);
                await knex('members_status_events')
                    .update('to_status', 'free')
                    .where('id', mostRecentStatusEvent.id);
            }
        }
    },
    async function down() {}
);
