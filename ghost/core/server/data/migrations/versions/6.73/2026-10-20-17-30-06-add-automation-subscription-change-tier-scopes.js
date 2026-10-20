const {
  addTable,
  combineNonTransactionalMigrations,
  createAddColumnMigration,
} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
  createAddColumnMigration('automations', 'trigger_from_tier_scope', {
    type: 'string',
    maxlength: 50,
    nullable: true,
    validations: { isIn: [['all_paid', 'selected_paid']] },
  }),

  createAddColumnMigration('automations', 'trigger_to_tier_scope', {
    type: 'string',
    maxlength: 50,
    nullable: true,
    validations: { isIn: [['free', 'selected_paid']] },
  }),

  addTable('automation_trigger_transition_tiers', {
    automation_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      references: 'automations.id',
      cascadeDelete: true,
    },
    direction: {
      type: 'string',
      maxlength: 50,
      nullable: false,
      validations: { isIn: [['from', 'to']] },
    },
    product_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      references: 'products.id',
    },
    '@@UNIQUE_CONSTRAINTS@@': [
      {
        columns: ['automation_id', 'direction', 'product_id'],
        indexName: 'automation_trigger_transition_tiers_unique',
      },
    ],
  }),
);
