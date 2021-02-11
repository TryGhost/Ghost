const {createTransactionalMigration} = require('../../utils');
const logging = require('../../../../../shared/logging');

module.exports = createTransactionalMigration(
    async function up(knex){
        const settingsKeys = ['installed_apps', 'active_apps'];
        logging.info(`Removing ${settingsKeys.join(',')} from "settings" table.`);

        await knex('settings')
            .whereIn('key', settingsKeys)
            .del();
    },
    async function down() {
        // noop: no need to recreate any apps as it's a cleanup in major version migration
    }
);
