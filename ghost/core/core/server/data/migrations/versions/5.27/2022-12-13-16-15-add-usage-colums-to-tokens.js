const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('tokens', 'updated_at', {
        type: 'dateTime',
        nullable: true
    }),

    createAddColumnMigration('tokens', 'first_used_at', {
        type: 'dateTime',
        nullable: true
    }),

    createAddColumnMigration('tokens', 'used_count', {
        type: 'integer',
        nullable: false,
        unsigned: true,
        defaultTo: 0
    })
);
