const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts_meta', 'email_only', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
