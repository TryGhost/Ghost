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

        // Set newsletter ID on email and related post records
        await knex('emails')
            .join('posts', 'emails.post_id', '=', 'posts.id')
            .update({
                ['emails.newsletter_id']: newsletter.id,
                ['posts.newsletter_id']: newsletter.id
            })
            .where('emails.newsletter_id', null);
    },
    async function down() {
        // Not required
    }
);
