const logging = require('@tryghost/logging');
const crypto = require('crypto');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const tokensWithoutUUID = await knex.select('id').from('tokens').whereNull('uuid');

        logging.info(`Adding uuid field value to ${tokensWithoutUUID.length} tokens.`);

        // eslint-disable-next-line no-restricted-syntax
        for (const token of tokensWithoutUUID) {
            await knex('tokens').update('uuid', crypto.randomUUID()).where('id', token.id);
        }
    },
    // down is a no-op
    async function down() {}
);
