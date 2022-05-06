const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Linking existing emails and related posts to the default newsletter');

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

        // Set newsletter ID only on posts with related email records without a newsletter assigned
        await knex('posts')
            .update('newsletter_id', newsletter.id)
            .whereIn('id', knex.raw('SELECT post_id FROM emails WHERE emails.newsletter_id IS NULL'));

        await knex('emails')
            .update('newsletter_id', newsletter.id)
            .whereNull('newsletter_id');
    },
    async function down() {
        // Not required
    }
);
