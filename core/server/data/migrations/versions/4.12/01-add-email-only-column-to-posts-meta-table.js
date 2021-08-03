const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts_meta', 'email_only', {
    type: 'bool',
    nullable: false,
    defaultTo: false
});
