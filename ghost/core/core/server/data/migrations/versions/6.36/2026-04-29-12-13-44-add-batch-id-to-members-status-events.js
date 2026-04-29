const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_status_events', 'batch_id', {
    type: 'string',
    maxlength: 24,
    nullable: true
});
