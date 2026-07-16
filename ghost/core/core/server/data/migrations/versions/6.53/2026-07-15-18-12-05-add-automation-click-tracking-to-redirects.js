const {combineNonTransactionalMigrations, createAddColumnMigration, createNonTransactionalMigration} = require('../../utils');
const commands = require('../../../schema/commands');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('redirects', 'automation_action_id', {
        type: 'string',
        maxlength: 24,
        nullable: true,
        references: 'automation_actions.id',
        setNullDelete: true
    }, {algorithm: 'auto'}),
    createAddColumnMigration('redirects', 'automation_to_hash', {
        type: 'string',
        maxlength: 64,
        nullable: true
    }, {algorithm: 'auto'}),
    createNonTransactionalMigration(
        async function up(knex) {
            await commands.addUnique('redirects', ['automation_action_id', 'automation_to_hash'], knex);
        },
        async function down(knex) {
            await commands.dropUnique('redirects', ['automation_action_id', 'automation_to_hash'], knex);
        }
    )
);
