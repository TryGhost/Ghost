const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        // Get the default newsletter
        const newsletter = await knex('newsletters')
            .where('status', 'active')
            .orderBy('sort_order', 'asc')
            .orderBy('created_at', 'asc')
            .orderBy('id', 'asc')
            .first('id');

        if (!newsletter) {
            logging.error(`Default newsletter not found - skipping`);
            return;
        }

        // Set subscribe events
        const updatedRows = await knex('members_subscribe_events')
            .update({
                newsletter_id: newsletter.id
            })
            .where('newsletter_id', null);

        logging.info(`Updated ${updatedRows} members_subscribe_events with default newsletter id`);
    },
    async function down() {
        // Not required
    }
);
