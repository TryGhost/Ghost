const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Setting email_disabled to true for all members that have their email on the suppression list');

        await knex('members')
            .join('suppressions', 'members.email', 'suppressions.email')
            .update({
                email_disabled: true
            });
    },
    async function down(knex) {
        logging.info('Setting email_disabled to false for all members');

        await knex('members')
            .update({
                email_disabled: false
            });
    }
);
