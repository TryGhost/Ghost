const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_created_events', 'batch_id', {
    type: 'string',
    maxlength: 24,
    nullable: true
});
