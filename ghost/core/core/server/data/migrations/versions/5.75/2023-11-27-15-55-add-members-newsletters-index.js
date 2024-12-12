const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const {addIndex, dropIndex} = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        await addIndex('members_newsletters', ['newsletter_id', 'member_id'], knex);
    },
    async function down(knex) {
        try {
            await dropIndex('members_newsletters', ['newsletter_id', 'member_id'], knex);
        } catch (err) {
            if (err.code === 'ER_DROP_INDEX_FK') {
                logging.error({
                    message: 'Error dropping index over members_newsletters(newsletter_id, member_id), re-adding index for newsletter_id'
                });

                await addIndex('members_newsletters', ['newsletter_id'], knex);
                await dropIndex('members_newsletters', ['newsletter_id', 'member_id'], knex);
                return;
            }

            throw err;
        }
    }
);
