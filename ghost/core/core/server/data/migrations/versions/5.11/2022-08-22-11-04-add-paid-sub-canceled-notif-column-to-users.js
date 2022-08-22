const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('users', 'paid_subscription_canceled_notification', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
