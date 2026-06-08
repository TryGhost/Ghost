const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('users', 'gift_subscription_redemption_notification', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
