import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('automations', 'trigger_type', {
  type: 'string',
  maxlength: 50,
  nullable: true,
  validations: { isIn: [['membership_started']] },
});
