const {combineNonTransactionalMigrations, createAddColumnMigration, createNonTransactionalMigration} = require('../../utils');
const {addUnique, dropUnique} = require('../../../schema/commands');

const uniqueColumns = ['automation_action_revision_id', 'to_hash'];

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('redirects', 'to_hash', {
        type: 'string',
        maxlength: 64,
        nullable: true
    }),
    createNonTransactionalMigration(
        async function up(knex) {
            await addUnique('redirects', uniqueColumns, knex);
        },
        async function down(knex) {
            await dropUnique('redirects', uniqueColumns, knex);
        }
    )
);
