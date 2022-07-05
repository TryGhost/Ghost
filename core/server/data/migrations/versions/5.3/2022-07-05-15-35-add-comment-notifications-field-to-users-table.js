const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('users', 'comment_notifications', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
