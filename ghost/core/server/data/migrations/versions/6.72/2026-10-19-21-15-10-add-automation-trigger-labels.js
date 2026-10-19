const { addTable } = require('../../utils');

module.exports = addTable('automation_trigger_labels', {
  automation_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: 'automations.id',
    cascadeDelete: true,
  },
  label_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: 'labels.id',
    cascadeDelete: true,
  },
  starts_at: { type: 'dateTime', nullable: false },
  checked_until: { type: 'dateTime', nullable: true },
  '@@UNIQUE_CONSTRAINTS@@': [['automation_id', 'label_id']],
});
