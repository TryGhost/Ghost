const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration(
  'automated_email_recipients',
  'automation_run_step_id',
  {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'automation_run_steps.id',
  },
  { algorithm: 'auto' },
);
