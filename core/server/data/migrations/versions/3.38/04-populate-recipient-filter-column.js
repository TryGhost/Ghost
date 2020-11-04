const {createTransactionalMigration} = require('../../utils');
const logging = require('../../../../../shared/logging');

module.exports = createTransactionalMigration(
    async function up(connection) {
        logging.info('Updating emails.recipient_filter values based on posts.visibility');

        const paidPostIds = (await connection('posts')
            .select('id')
            .where('visibility', 'paid')).map(row => row.id);

        const membersPostIds = (await connection('posts')
            .select('id')
            .where('visibility', 'members')).map(row => row.id);

        const publicPostIds = (await connection('posts')
            .select('id')
            .where('visibility', 'public')).map(row => row.id);

        await connection('emails')
            .update('recipient_filter', 'paid')
            .whereIn('post_id', paidPostIds);

        await connection('emails')
            .update('recipient_filter', 'all')
            .whereIn('post_id', membersPostIds.concat(publicPostIds));
    },

    async function down(connection) {
        logging.info('Updating emails.recipient_filter values to paid');
        await connection('emails')
            .update('recipient_filter', 'paid');
    }
);

