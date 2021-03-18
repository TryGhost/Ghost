const logging = require('../../../../../shared/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(async function up(knex) {
    const typoedPermission = await knex.select('*').from('permissions').where('action_type', 'backupContect').first();

    if (!typoedPermission) {
        return logging.warn('Not updating permissions, no typo found');
    }

    logging.info('Updating permissions, fixing typo by renaming "backupContect" to "backupContent"');
    await knex('permissions').update('action_type', 'backupContent').where('action_type', 'backupContect');
}, async function down() {
    // noop
});
