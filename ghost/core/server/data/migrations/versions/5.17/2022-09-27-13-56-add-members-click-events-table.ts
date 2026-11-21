import { addTable } from '../../utils';

export default addTable('members_click_events', {
  id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  member_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: 'members.id',
    cascadeDelete: true,
  },
  redirect_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: 'redirects.id',
    cascadeDelete: true,
  },
  created_at: { type: 'dateTime', nullable: false },
});
