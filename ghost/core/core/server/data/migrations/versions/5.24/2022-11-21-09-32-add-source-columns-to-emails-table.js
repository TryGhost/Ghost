const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('emails', 'source', {
        type: 'text',
        maxlength: 1000000000,
        fieldtype: 'long',
        nullable: true
    }),

    createAddColumnMigration('emails', 'source_type', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'html'
    })
);
