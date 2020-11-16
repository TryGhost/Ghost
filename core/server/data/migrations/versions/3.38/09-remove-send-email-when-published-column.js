const {createDropColumnMigration} = require('../../utils');

module.exports = createDropColumnMigration('posts', 'send_email_when_published', {
    type: 'bool',
    nullable: true,
    defaultTo: false
});
