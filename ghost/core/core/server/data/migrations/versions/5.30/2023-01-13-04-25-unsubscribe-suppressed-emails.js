const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const membersWithSuppressedEmails = await knex.select('members.id').from('members').innerJoin('suppressions', 'members.email', 'suppressions.email');

        if (membersWithSuppressedEmails.length === 0) {
            logging.info('No emails suppressions found');
            return;
        } else {
            logging.info(`Unsubscribing ${membersWithSuppressedEmails.length} members from newsletters due to email suppressions`);
        }

        await knex('members_newsletters').whereIn('member_id', membersWithSuppressedEmails.map(member => member.id)).del();
    },
    async function down() {
        logging.info('Not repopulating members_newsletters');
    }
);
