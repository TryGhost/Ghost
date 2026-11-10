const { addTable } = require('../../utils');

module.exports = addTable('automation_trigger_rules', {
  id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  automation_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: 'automations.id',
    cascadeDelete: true,
  },
  trigger_type: {
    type: 'string',
    maxlength: 50,
    nullable: false,
    validations: { isIn: [['free_signup', 'paid_subscription_started']] },
  },
  scope: {
    type: 'string',
    maxlength: 50,
    nullable: true,
    validations: { isIn: [['any_paid_tier', 'specific_paid_tier']] },
  },
  product_id: {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'products.id',
    cascadeDelete: true,
  },
  created_at: { type: 'dateTime', nullable: false },
  '@@UNIQUE_CONSTRAINTS@@': [['automation_id', 'product_id']],
});
