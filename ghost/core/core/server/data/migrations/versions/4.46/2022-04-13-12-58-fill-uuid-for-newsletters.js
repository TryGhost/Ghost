const logging = require('@tryghost/logging');
const crypto = require('crypto');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const newslettersWithoutUUID = await knex.select('id').from('newsletters').whereNull('uuid');

        logging.info(`Adding uuid field value to ${newslettersWithoutUUID.length} newsletters.`);

        // eslint-disable-next-line no-restricted-syntax
        for (const newsletter of newslettersWithoutUUID) {
            await knex('newsletters').update('uuid', crypto.randomUUID()).where('id', newsletter.id);
        }
    },
    async function down() {
        // Not required: we would lose information here.
    }
);
