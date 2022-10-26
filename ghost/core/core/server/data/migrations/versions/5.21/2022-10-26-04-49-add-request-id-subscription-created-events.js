const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_subscription_created_events', 'request_id', {
    type: 'string',
    maxlength: 24,
    nullable: true
});
