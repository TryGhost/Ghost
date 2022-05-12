const logging = require('@tryghost/logging');
const _ = require('lodash');
const {createTransactionalMigration} = require('../../utils');

const renameMappings = [{
    from: 'lang',
    to: 'locale'
}, {
    from: 'session_secret',
    to: 'admin_session_secret'
}];

module.exports = createTransactionalMigration(
    async function up(knex) {
        const keys = _.flatMap(renameMappings, (m) => {
            return [m.from, m.to];
        });

        const settings = await knex('settings').select('key', 'value').whereIn('key', keys);

        // eslint-disable-next-line no-restricted-syntax
        for (const renameMapping of renameMappings) {
            if (_.find(settings, {key: renameMapping.to}) && _.find(settings, {key: renameMapping.from})) {
                let updatedValue = _.find(settings, {key: renameMapping.from}).value;
                // CASE: default settings were added already, update them with old values & remove old settings
                logging.info(`Updating ${renameMapping.to} with value from ${renameMapping.from}`);
                await knex('settings')
                    .where('key', renameMapping.to)
                    .update('value', updatedValue);

                logging.info(`Deleting ${renameMapping.from}`);
                await knex('settings')
                    .where('key', renameMapping.from)
                    .del();
            } else if (_.find(settings, {key: renameMapping.from})) {
                // CASE: old settings exist, update them
                logging.info(`Renaming ${renameMapping.from} to ${renameMapping.to}`);
                await knex('settings')
                    .where('key', renameMapping.from)
                    .update('key', renameMapping.to);
            } else {
                // CASE: old settings don't exist, let default settings create them
                logging.warn(`Setting ${renameMapping.from} is missing, skipping update`);
            }
        }
    },

    async function down() {
        // no-op: we can't rollback as there are irreversible migrations in 5.0
    }
);
