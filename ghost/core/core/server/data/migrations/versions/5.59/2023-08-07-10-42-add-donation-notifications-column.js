const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('users', 'donation_notifications', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
