const {createRenameColumnMigration} = require('../../utils');

module.exports = createRenameColumnMigration('users', 'gift_subscription_purchase_notification', 'gift_subscription_notifications');
