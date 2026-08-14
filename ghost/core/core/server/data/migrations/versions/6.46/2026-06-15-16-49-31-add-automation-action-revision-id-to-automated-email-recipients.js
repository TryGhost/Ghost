const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('automated_email_recipients', 'automation_action_revision_id', {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'automation_action_revisions.id'
});
