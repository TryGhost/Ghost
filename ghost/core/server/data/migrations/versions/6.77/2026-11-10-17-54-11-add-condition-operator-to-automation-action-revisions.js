const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('automation_action_revisions', 'condition_operator', {
  type: 'string',
  maxlength: 50,
  nullable: true,
  validations: { isIn: [['has_any', 'has_all', 'has_none']] },
});
