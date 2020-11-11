const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'send_email_when_published', {
    type: 'bool',
    nullable: true,
    defaultTo: false
});
