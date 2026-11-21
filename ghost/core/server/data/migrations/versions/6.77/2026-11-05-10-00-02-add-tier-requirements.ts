import { addTable } from '../../utils';

export default addTable('tier_requirements', {
  requirement: { type: 'string', maxlength: 50, nullable: false, primary: true },
  tier_scope: {
    type: 'string',
    maxlength: 50,
    nullable: false,
    validations: { isIn: [['all_paid', 'selected_paid']] },
  },
  countries: { type: 'text', maxlength: 65535, nullable: true },
  created_at: { type: 'dateTime', nullable: false },
  updated_at: { type: 'dateTime', nullable: true },
});
