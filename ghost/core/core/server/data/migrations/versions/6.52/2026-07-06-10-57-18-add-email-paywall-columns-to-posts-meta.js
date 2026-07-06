const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('posts_meta', 'email_paywall_heading', {type: 'string', maxlength: 300, nullable: true}, {algorithm: 'auto'}),
    createAddColumnMigration('posts_meta', 'email_paywall_description', {type: 'string', maxlength: 500, nullable: true}, {algorithm: 'auto'}),
    createAddColumnMigration('posts_meta', 'email_paywall_button_text', {type: 'string', maxlength: 191, nullable: true}, {algorithm: 'auto'}),
    createAddColumnMigration('posts_meta', 'email_paywall_offer_code', {type: 'string', maxlength: 191, nullable: true}, {algorithm: 'auto'})
);
