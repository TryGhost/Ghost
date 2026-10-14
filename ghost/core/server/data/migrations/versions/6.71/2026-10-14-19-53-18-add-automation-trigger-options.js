const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('automations', 'trigger_options', {
  type: 'text',
  maxlength: 65535,
  nullable: true,
});
