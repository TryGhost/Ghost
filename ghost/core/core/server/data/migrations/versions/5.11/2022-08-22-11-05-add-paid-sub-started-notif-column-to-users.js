const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('users', 'paid_subscription_started_notification', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
