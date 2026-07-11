const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('email_design_settings', 'sender_name', {type: 'string', maxlength: 191, nullable: true}, {algorithm: 'auto'}),
    createAddColumnMigration('email_design_settings', 'sender_email', {type: 'string', maxlength: 191, nullable: true}, {algorithm: 'auto'}),
    createAddColumnMigration('email_design_settings', 'sender_reply_to', {type: 'string', maxlength: 191, nullable: true}, {algorithm: 'auto'})
);
