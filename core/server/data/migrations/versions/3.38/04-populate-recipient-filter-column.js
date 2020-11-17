const {chunk} = require('lodash');
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

        const paidPostIdChunks = chunk(paidPostIds, 999);
        const membersAndPublicPostIdChunks = chunk(membersPostIds.concat(publicPostIds), 999);

        for (const paidPostIdsChunk of paidPostIdChunks) {
            await connection('emails')
                .update('recipient_filter', 'paid')
                .whereIn('post_id', paidPostIdsChunk);
        }

        for (const membersAndPublicPostIdsChunk of membersAndPublicPostIdChunks) {
            await connection('emails')
                .update('recipient_filter', 'all')
                .whereIn('post_id', membersAndPublicPostIdsChunk);
        }
    },

    async function down(connection) {
        logging.info('Updating emails.recipient_filter values to paid');
        await connection('emails')
            .update('recipient_filter', 'paid');
    }
);

