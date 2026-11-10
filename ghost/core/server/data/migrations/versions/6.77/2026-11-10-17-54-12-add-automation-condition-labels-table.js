const { addTable } = require('../../utils');

module.exports = addTable('automation_condition_labels', {
  id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  action_revision_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: 'automation_action_revisions.id',
    cascadeDelete: true,
  },
  label_id: {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'labels.id',
    setNullDelete: true,
  },
  '@@UNIQUE_CONSTRAINTS@@': [['action_revision_id', 'label_id']],
});
