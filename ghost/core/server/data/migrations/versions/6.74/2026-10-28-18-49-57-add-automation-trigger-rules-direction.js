const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('automation_trigger_rules', 'direction', {
  type: 'string',
  maxlength: 50,
  nullable: true,
  validations: { isIn: [['from', 'to']] },
});
