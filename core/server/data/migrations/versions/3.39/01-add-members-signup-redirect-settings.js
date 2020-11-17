const logging = require('../../../../../shared/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(

    async function up(connection) {
        logging.info('Adding members_{paid,free}_signup_redirect settings to the members group');
        await connection('settings')
            .whereIn('key', ['members_paid_signup_redirect', 'members_free_signup_redirect'])
            .update({
                group: 'members'
            });
    },

    async function down() {}
);
