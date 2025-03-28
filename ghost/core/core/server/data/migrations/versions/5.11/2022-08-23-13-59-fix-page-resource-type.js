const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info(`Changing Action event 'page' resource_type to 'post'`);

        const affectedRows = await knex('actions')
            .update({
                resource_type: 'post',
                context: JSON.stringify({
                    type: 'page'
                })
            })
            .where('resource_type', 'page');

        logging.info(`Updated ${affectedRows} Action events from 'page' to 'post'`);
    },
    async function down() {
        // no-op: we don't want to put `pages` back as a resource type
    }
);
