const {createNonTransactionalMigration} = require('../../utils');
const {addIndex, dropIndex} = require('../../../schema/commands');

// Indexes for the admin "all comments" moderation page (getAdminAllComments).
// The query orders by created_at and emits count.replies / count.direct_replies
// as per-row correlated subqueries; without these indexes each subquery
// full-scans the comments table once per returned row:
//
//  - created_at: reverse index scan replaces a filesort over the full table
//  - status: the moderation UI offers a status:published / status:hidden filter
//    whose paginated COUNT picks this narrow index
//  - (in_reply_to_id, status): count.direct_replies r2 subquery as a covering
//    range scan (status filter satisfied in-index)
//  - (parent_id, in_reply_to_id, status): count.direct_replies r1 plus partial
//    cover of count.replies (parent_id selectivity + status filter in-index)
//
// InnoDB consolidates the auto-created single-column FK indexes on parent_id
// and in_reply_to_id into the two composites above as soon as they exist —
// down() has to recreate the single-column FK indexes before dropping the
// composites or MySQL rejects the drop with "needed in a foreign key
// constraint".
module.exports = createNonTransactionalMigration(
    async function up(knex) {
        await addIndex('comments', ['created_at'], knex);
        await addIndex('comments', ['status'], knex);
        await addIndex('comments', ['in_reply_to_id', 'status'], knex);
        await addIndex('comments', ['parent_id', 'in_reply_to_id', 'status'], knex);
    },
    async function down(knex) {
        await dropIndex('comments', ['created_at'], knex);
        await dropIndex('comments', ['status'], knex);
        await addIndex('comments', ['parent_id'], knex);
        await addIndex('comments', ['in_reply_to_id'], knex);
        await dropIndex('comments', ['in_reply_to_id', 'status'], knex);
        await dropIndex('comments', ['parent_id', 'in_reply_to_id', 'status'], knex);
    }
);
