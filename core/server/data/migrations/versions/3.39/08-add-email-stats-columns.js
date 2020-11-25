const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('emails', 'delivered_count', {
        type: 'integer',
        unsigned: true,
        nullable: false,
        defaultTo: 0
    }),
    createAddColumnMigration('emails', 'opened_count', {
        type: 'integer',
        unsigned: true,
        nullable: false,
        defaultTo: 0
    }),
    createAddColumnMigration('emails', 'failed_count', {
        type: 'integer',
        unsigned: true,
        nullable: false,
        defaultTo: 0
    })
);
