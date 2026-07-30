const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('posts_meta', 'paywall_heading', {type: 'string', maxlength: 300, nullable: true}, {algorithm: 'auto'}),
    createAddColumnMigration('posts_meta', 'paywall_button_text', {type: 'string', maxlength: 100, nullable: true}, {algorithm: 'auto'}),
    createAddColumnMigration('posts_meta', 'paywall_button_url', {type: 'string', maxlength: 2000, nullable: true}, {algorithm: 'auto'})
);
