const {createNonTransactionalMigration} = require('../../utils');
const {createTable, deleteTable} = require('../../../schema/commands');

// gift_links has never shipped (the table is empty everywhere), so we drop and recreate it
// in the new active/history shape rather than altering in place. down() restores the
// original single-table shape.
const ORIGINAL_GIFT_LINKS_TABLE = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id', cascadeDelete: true},
    token: {type: 'string', maxlength: 64, nullable: false, unique: true},
    status: {
        type: 'string', maxlength: 50, nullable: false, defaultTo: 'active', validations: {
            isIn: [['active', 'inactive']]
        }
    },
    redeemed_count: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
    last_redeemed_at: {type: 'dateTime', nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['post_id', 'status']
    ]
};

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        // Drop the child (gift_links_active FKs gift_links) before the parent. Every drop is
        // IF EXISTS and precedes its create, so up() is safe to re-run after a partial run.
        await deleteTable('gift_links_active', knex);
        await deleteTable('gift_links', knex);
        await createTable('gift_links', knex);
        await createTable('gift_links_active', knex);
    },
    async function down(knex) {
        await deleteTable('gift_links_active', knex);
        await deleteTable('gift_links', knex);
        await createTable('gift_links', knex, ORIGINAL_GIFT_LINKS_TABLE);
    }
);
