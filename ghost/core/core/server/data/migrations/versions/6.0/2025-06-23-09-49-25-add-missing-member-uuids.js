// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const logging = require('@tryghost/logging');
const crypto = require('crypto');

// For DML - data changes
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const membersWithoutUUID = await knex.select('id').from('members').whereNull('uuid');

        logging.info(`Adding uuid field value to ${membersWithoutUUID.length} members.`);

        // eslint-disable-next-line no-restricted-syntax
        for (const member of membersWithoutUUID) {
            await knex('members').update('uuid', crypto.randomUUID()).where('id', member.id);
        }
    },
    // down is a no-op
    async function down() {}
);