// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const crypto = require('crypto');
const logging = require('@tryghost/logging');

// For DML - data changes
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Populating RSS tokens for existing members');

        // Get all members without RSS tokens
        const membersWithoutToken = await knex.select('id', 'email').from('members').whereNull('rss_token');

        logging.info(`Adding RSS tokens to ${membersWithoutToken.length} members`);

        // Update each member with a unique RSS token
        // eslint-disable-next-line no-restricted-syntax
        for (const member of membersWithoutToken) {
            const rssToken = crypto.randomBytes(32).toString('hex');
            await knex('members').update('rss_token', rssToken).where('id', member.id);
        }

        logging.info('Successfully populated RSS tokens for all members');
    },
    // down is a no-op (we don't want to remove RSS tokens)
    async function down() {}
);