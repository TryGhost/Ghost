const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const rows = await knex
            .pluck('m.id')
            .from('members AS m')
            .innerJoin('suppressions AS s', 'm.email', '=', 's.email');

        if (rows.length === 0) {
            logging.info(`No suppressed emails found - skipping migration`);
            return;
        }

        logging.info(`Unsubscribing ${rows.length} members from all newsletters`);

        await knex('members_newsletters').whereIn('member_id', rows).del();
    },
    async function down() {
        // We don't have enough information to do anything here.
    }
);
