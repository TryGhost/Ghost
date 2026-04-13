const {createDropColumnMigration} = require('../../utils');

module.exports = createDropColumnMigration('users', 'gift_subscription_redemption_notification', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
