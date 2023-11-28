const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const {addIndex, dropIndex} = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Adding index over members_newsletters(newsletter_id, member_id)');
        await addIndex('members_newsletters', ['newsletter_id', 'member_id'], knex);
    },
    async function down(knex) {
        logging.info('Dropping index over members_newsletters(newsletter_id, member_id)');
        try {
            await dropIndex('members_newsletters', ['newsletter_id', 'member_id'], knex);
        } catch (err) {
            logging.error({
                err,
                message: 'Error dropping index over members_newsletters(newsletter_id, member_id)'
            });

            logging.info('Creating index over members_newsletters(newsletter_id)');
            await addIndex('members_newsletters', ['newsletter_id'], knex);

            logging.info('Dropping index over members_newsletters(newsletter_id, member_id)');
            await dropIndex('members_newsletters', ['newsletter_id', 'member_id'], knex);
        }
    }
);
