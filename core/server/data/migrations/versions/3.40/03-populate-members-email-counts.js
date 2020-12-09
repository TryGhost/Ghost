const logging = require('../../../../../shared/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Populating email counts on members');
        await knex('members')
            .update({
                email_count: knex.raw('(SELECT COUNT(id) FROM email_recipients WHERE email_recipients.member_id = members.id)'),
                email_opened_count: knex.raw('(SELECT COUNT(id) FROM email_recipients WHERE email_recipients.member_id = members.id AND email_recipients.opened_at IS NOT NULL)')
            });
    },

    async function down() {}
);
