const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('redirects', 'automation_action_revision_id', {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'automation_action_revisions.id',
    setNullDelete: true
}, {algorithm: 'auto'});
