const {createNonTransactionalMigration} = require('../../utils');
const {createTable, deleteTable} = require('../../../schema/commands');

// Safe to drop and rebuild rather than alter in place: gift_links is empty everywhere (the
// gift-link API has never shipped).
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
        // Drop the dependent table first (idempotent + FK-safe): post_gift_links references
        // gift_links, and it may already exist from a fresh schema build.
        await deleteTable('post_gift_links', knex);
        await deleteTable('gift_links', knex);
        await createTable('gift_links', knex);
        await createTable('post_gift_links', knex);
    },
    async function down(knex) {
        await deleteTable('post_gift_links', knex);
        await deleteTable('gift_links', knex);
        await createTable('gift_links', knex, ORIGINAL_GIFT_LINKS_TABLE);
    }
);
