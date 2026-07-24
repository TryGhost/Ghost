const DatabaseInfo = require('@tryghost/database-info');
const {combineNonTransactionalMigrations, createAddColumnMigration, createNonTransactionalMigration} = require('../../utils');
const {addIndex, addUnique, dropUnique} = require('../../../schema/commands');

const uniqueColumns = ['automation_action_revision_id', 'to_hash'];
const columnDefinition = {
    type: 'string',
    maxlength: 32,
    nullable: true,
    generated: {
        dialect: 'mysql',
        expression: 'MD5(`to`)',
        storage: 'virtual'
    }
};

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('redirects', 'to_hash', columnDefinition, {algorithm: 'auto'}),
    createNonTransactionalMigration(
        async function up(knex) {
            await addUnique('redirects', uniqueColumns, knex);
        },
        async function down(knex) {
            // InnoDB removes its automatic single-column foreign-key index when
            // the composite index replaces it, so restore one before dropping
            // the composite index.
            if (DatabaseInfo.isMySQL(knex)) {
                await addIndex('redirects', ['automation_action_revision_id'], knex);
            }
            await dropUnique('redirects', uniqueColumns, knex);
        }
    )
);
