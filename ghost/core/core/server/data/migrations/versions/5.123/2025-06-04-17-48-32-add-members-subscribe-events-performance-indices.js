const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const {addIndex, dropIndex} = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Adding performance indexes for members_subscribe_events');
        
        // Index for newsletter-based queries with date filtering
        await addIndex('members_subscribe_events', ['newsletter_id', 'created_at'], knex);
        
        // Index for member-based filtering (used in newsletter stats)
        await addIndex('members_subscribe_events', ['member_id', 'newsletter_id'], knex);
    },
    async function down(knex) {
        logging.info('Removing performance indexes from members_subscribe_events');
        
        await dropIndex('members_subscribe_events', ['newsletter_id', 'created_at'], knex);
        await dropIndex('members_subscribe_events', ['member_id', 'newsletter_id'], knex);
    }
);