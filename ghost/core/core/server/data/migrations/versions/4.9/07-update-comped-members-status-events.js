const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Updating members_status_events for comped members');
        const compedMembers = await knex('members')
            .select('id')
            .where('status', 'comped');

        if (compedMembers.length === 0) {
            logging.info('No comped members found - skipping migration');
            return;
        } else {
            logging.info(`Found ${compedMembers.length} comped members - checking members_status_events`);
        }

        // eslint-disable-next-line no-restricted-syntax
        for (const member of compedMembers) {
            const mostRecentStatusEvent = await knex('members_status_events')
                .select('*')
                .where('member_id', member.id)
                .orderBy('created_at', 'desc')
                .limit(1)
                .first();

            if (!mostRecentStatusEvent) {
                logging.warn(`Could not find a status event for member ${member.id} - skipping this member`);
            } else if (mostRecentStatusEvent.to_status !== 'comped') {
                logging.info(`Updating members_status_event ${mostRecentStatusEvent.id}`);
                await knex('members_status_events')
                    .update('to_status', 'comped')
                    .where('id', mostRecentStatusEvent.id);
            }
        }
    },
    async function down() {}
);

