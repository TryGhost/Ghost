const logging = require('../../../../../shared/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(

    async function up(connection) {
        logging.info('Updating FirstPromoter settings -  firstpromoter, firstpromoter_id');
        await connection('settings')
            .whereIn('key', ['firstpromoter', 'firstpromoter_id'])
            .update({
                group: 'firstpromoter'
            });
    },

    async function down() { }
);
