const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('automation_action_revisions', 'webhook_config', {
  type: 'text',
  maxlength: 65535,
  nullable: true,
});
