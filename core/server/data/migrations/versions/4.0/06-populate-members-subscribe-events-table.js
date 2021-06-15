const {chunk} = require('lodash');
const ObjectID = require('bson-objectid');
const {createTransactionalMigration} = require('../../utils');
const logging = require('@tryghost/logging');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Populating members_subscribe_events from members');

        const allMembers = await knex.select(
            'id as member_id',
            'created_at'
        ).from('members');

        const unsubscribedMembers = await knex.select(
            'id as member_id',
            'updated_at as created_at'
        ).from('members').where('subscribed', false);

        const membersSubscribedEvents = allMembers.map((event) => {
            return {
                ...event,
                id: ObjectID().toHexString(),
                subscribed: true,
                source: 'member'
            };
        });

        const membersUnsubscribedEvents = unsubscribedMembers.map((event) => {
            return {
                ...event,
                id: ObjectID().toHexString(),
                subscribed: false,
                source: null
            };
        });

        const allEvents = membersSubscribedEvents.concat(membersUnsubscribedEvents);

        // SQLite3 supports 999 variables max, each row uses 5 variables so ⌊999/5⌋ = 199
        const chunkSize = 199;

        const eventChunks = chunk(allEvents, chunkSize);

        for (const events of eventChunks) {
            await knex.insert(events).into('members_subscribe_events');
        }
    },
    async function down(knex) {
        return knex('members_subscribe_events').del();
    }
);
