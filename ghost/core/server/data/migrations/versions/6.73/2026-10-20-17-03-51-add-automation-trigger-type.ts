const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('automations', 'trigger_type', {
  type: 'string',
  maxlength: 50,
  nullable: true,
  validations: { isIn: [['membership_started']] },
});
