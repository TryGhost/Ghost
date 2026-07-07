const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

const columnDefinition = {
    type: 'integer',
    unsigned: true,
    nullable: false,
    defaultTo: 0
};

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('members', 'automation_email_count', columnDefinition, {algorithm: 'instant'}),
    createAddColumnMigration('members', 'automation_tracked_email_count', columnDefinition, {algorithm: 'instant'}),
    createAddColumnMigration('members', 'automation_email_open_count', columnDefinition, {algorithm: 'instant'})
);
