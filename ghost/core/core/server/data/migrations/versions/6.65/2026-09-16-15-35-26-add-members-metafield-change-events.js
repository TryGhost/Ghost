const { addTable } = require('../../utils');

module.exports = addTable('members_metafield_change_events', {
  id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  member_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: 'members.id',
    cascadeDelete: true,
  },
  written_by_type: { type: 'string', maxlength: 50, nullable: false },
  written_by_id: { type: 'string', maxlength: 24, nullable: true },
  source: { type: 'string', maxlength: 50, nullable: false },
  metafields: { type: 'text', maxlength: 16777215, fieldtype: 'medium', nullable: false },
  created_at: { type: 'dateTime', nullable: false },
});
