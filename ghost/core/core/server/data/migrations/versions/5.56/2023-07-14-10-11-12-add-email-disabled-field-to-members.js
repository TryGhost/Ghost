const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'email_disabled', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
