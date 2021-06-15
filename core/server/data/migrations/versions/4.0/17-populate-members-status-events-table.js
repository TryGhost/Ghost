const {chunk} = require('lodash');
const ObjectID = require('bson-objectid');
const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Populating members_status_events from members table');

        await knex('members_status_events').del();

        const allMembers = await knex.select(
            'id as member_id',
            'status as to_status',
            'created_at'
        ).from('members');

        const membersStatusEvents = allMembers.map((event) => {
            return {
                ...event,
                id: ObjectID().toHexString(),
                from_status: null
            };
        });

        // SQLite3 supports 999 variables max, each row uses 5 variables so ⌊999/5⌋ = 199
        const chunkSize = 199;

        const eventChunks = chunk(membersStatusEvents, chunkSize);

        for (const events of eventChunks) {
            await knex.insert(events).into('members_status_events');
        }
    },
    async function down(knex) {
        logging.info('Deleting all members_status_events');
        return knex('members_status_events').del();
    }
);

