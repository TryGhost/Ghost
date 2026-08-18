const logging = require('@tryghost/logging');
const {createDropNullableMigration} = require('../../utils');

const dropNullableMigration = createDropNullableMigration('members_subscribe_events', 'newsletter_id', {
    disableForeignKeyChecks: true
});

module.exports = {
    ...dropNullableMigration,
    async up(config) {
        const knex = config.transacting || config.connection;

        const deletedEvents = await knex('members_subscribe_events').whereNull('newsletter_id').del();
        logging.info(`Deleted ${deletedEvents} members_subscribe_events with a null newsletter_id`);

        await dropNullableMigration.up(config);
    }
};
