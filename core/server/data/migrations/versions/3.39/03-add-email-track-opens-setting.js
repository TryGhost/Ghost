const logging = require('../../../../../shared/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(

    async function up(connection) {
        logging.info('Updating email_track_opens setting to email group');
        await connection('settings')
            .whereIn('key', ['email_track_opens'])
            .update({
                group: 'email'
            });
    },

    async function down() {}
);
