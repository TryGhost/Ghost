const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts_meta', 'email_subject', {
    type: 'string',
    maxlength: 300,
    nullable: true
});
