const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const {addColumn, addIndex, dropColumn, dropIndex} = require('../../../schema/commands');

const columnDefinition = {
    type: 'dateTime',
    nullable: true
};

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        const hasPinnedAtColumn = await knex.schema.hasColumn('comments', 'pinned_at');
        if (hasPinnedAtColumn) {
            logging.warn('Adding comments.pinned_at column - skipping as column already exists');
        } else {
            logging.info('Adding comments.pinned_at column');
            await addColumn('comments', 'pinned_at', knex, columnDefinition);
        }

        await addIndex('comments', ['post_id', 'parent_id', 'pinned_at'], knex);
    },
    async function down(knex) {
        await addIndex('comments', ['post_id'], knex);
        await dropIndex('comments', ['post_id', 'parent_id', 'pinned_at'], knex);

        const hasPinnedAtColumn = await knex.schema.hasColumn('comments', 'pinned_at');
        if (!hasPinnedAtColumn) {
            logging.warn('Removing comments.pinned_at column - skipping as column does not exist');
            return;
        }

        logging.info('Removing comments.pinned_at column');
        await dropColumn('comments', 'pinned_at', knex, columnDefinition);
    }
);
