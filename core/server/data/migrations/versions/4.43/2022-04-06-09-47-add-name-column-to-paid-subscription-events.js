const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_paid_subscription_events', 'name', {
    type: 'string',
    maxlength: '50',
    nullable: true
});
