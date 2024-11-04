const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('jobs', 'metadata', {
        type: 'string',
        maxlength: 2000,
        nullable: true
    }),
    createAddColumnMigration('jobs', 'queue_entry', {
        type: 'integer',
        nullable: true,
        unsigned: true
    })
);
