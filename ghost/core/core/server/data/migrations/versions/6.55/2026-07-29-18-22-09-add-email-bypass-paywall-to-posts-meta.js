const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts_meta', 'email_bypass_paywall', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
