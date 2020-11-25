const {createDropColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createDropColumnMigration('emails', 'meta', {
        type: 'text',
        length: 65535,
        nullable: true
    }),
    createDropColumnMigration('emails', 'stats', {
        type: 'text',
        length: 65535,
        nullable: true
    })
);
