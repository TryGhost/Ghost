const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('users', 'bluesky_did', {
        type: 'string',
        maxlength: 191,
        nullable: true,
        unique: true
    })
);
