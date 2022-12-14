const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Changing Ghost Explore Integration to type "builtin"');
        await knex('integrations')
            .where({
                name: 'Ghost Explore',
                slug: 'ghost-explore'
            })
            .update('type', 'builtin');
    },
    async function down(knex) {
        logging.info('Changing Ghost Explore Integration to type "internal"');

        await knex('integrations')
            .where({
                name: 'Ghost Explore',
                slug: 'ghost-explore'
            })
            .update('type', 'internal');
    }
);
