const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('users', 'free_member_signup_notification', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
