const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration(
  'automation_trigger_rules',
  'label_id',
  {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'labels.id',
    restrictDelete: true,
  },
  { algorithm: 'auto' },
);
