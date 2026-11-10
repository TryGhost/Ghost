const { combineNonTransactionalMigrations, createAddColumnMigration } = require('../../utils');

module.exports = combineNonTransactionalMigrations(
  createAddColumnMigration('automation_trigger_rules', 'operator', {
    type: 'string',
    maxlength: 50,
    nullable: true,
    validations: { isIn: [['has_any', 'has_all', 'has_none']] },
  }),
  createAddColumnMigration(
    'automation_trigger_rules',
    'label_id',
    {
      type: 'string',
      maxlength: 24,
      nullable: true,
      references: 'labels.id',
    },
    { algorithm: 'auto' },
  ),
);
