const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_paid_subscription_events', 'type', {
    type: 'string',
    maxlength: '50',
    nullable: true
});
