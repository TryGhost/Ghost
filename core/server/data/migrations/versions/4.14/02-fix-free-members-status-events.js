const _ = require('lodash');
const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils.js');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Updating members_status_events for free members');
        const freeMemberEvents = await knex('members')
            .select(
                'members.id as member_id',
                'members_status_events.id',
                'members_status_events.to_status',
                'members_status_events.created_at'
            )
            .innerJoin(
                'members_status_events',
                'members.id',
                'members_status_events.member_id'
            )
            .where('members.status', 'free');

        if (freeMemberEvents.length === 0) {
            logging.info('No free members found - skipping migration');
            return;
        }

        const eventsByMember = _.groupBy(freeMemberEvents, 'member_id');

        const eventsToUpdate = Object.keys(eventsByMember).reduce((incorrectEvents, memberId) => {
            const events = eventsByMember[memberId];

            events.sort((a, b) => {
                return new Date(b.created_at) - new Date(a.created_at);
            });

            const mostRecentStatusEvent = events[0];

            if (mostRecentStatusEvent && mostRecentStatusEvent.to_status !== 'free') {
                return incorrectEvents.concat(mostRecentStatusEvent.id);
            }

            return incorrectEvents;
        }, []);

        logging.info(`Found ${eventsToUpdate.length} member status events that need updating`);

        // Umm? Well... The current version of SQLite3 bundled with Ghost supports
        // a maximum of 999 variables, we use one variable for the SET value
        // and so we're left with 998 for our WHERE IN clause values
        const chunkedEventsToUpdate = _.chunk(eventsToUpdate, 998);

        // eslint-disable-next-line no-restricted-syntax
        for (const chunk of chunkedEventsToUpdate) {
            logging.info(`Updating a chunk of ${chunk.length} member status events`);
            await knex('members_status_events')
                .update('to_status', 'free')
                .whereIn('id', chunk);
        }
    },
    async function down() {}
);
