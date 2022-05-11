const logging = require('@tryghost/logging');
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
        // eslint-disable-next-line no-restricted-syntax
        for (const renameMapping of renameMappings) {
            const oldSetting = await knex('settings')
                .where('key', renameMapping.from)
                .select('value')
                .first();

            if (!oldSetting) {
                logging.warn(`Could not find setting ${renameMapping.from}, not updating ${renameMapping.to} value`);
                continue;
            }

            const updatedValue = renameMapping.getToValue ? renameMapping.getToValue(oldSetting.value) : oldSetting.value;

            logging.info(`Updating ${renameMapping.to} with value from ${renameMapping.from}`);
            await knex('settings')
                .where('key', renameMapping.to)
                .update('value', updatedValue);

            logging.info(`Deleting ${renameMapping.from}`);
            await knex('settings')
                .where('key', renameMapping.from)
                .del();
        }
    },

    async function down() {
        // no-op: we can't rollback as there are irreversible migrations in 5.0
    }
);
