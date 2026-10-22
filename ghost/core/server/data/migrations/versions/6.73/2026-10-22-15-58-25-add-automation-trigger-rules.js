const { commands } = require('../../../schema');
const {
  addTable,
  combineNonTransactionalMigrations,
  createNonTransactionalMigration,
} = require('../../utils');

// Each row is a complete alternative, not one side of a transition. The composite
// foreign key prevents rules from belonging to a different event than their parent.
// Scope/product consistency and duplicate alternatives must be validated by writers;
// isIn metadata is not a database CHECK, and nullable UNIQUE keys allow duplicates.
module.exports = combineNonTransactionalMigrations(
  createNonTransactionalMigration(
    async function up(connection) {
      await commands.addUnique('automations', ['id', 'trigger_type'], connection);
    },
    async function down(connection) {
      await commands.dropUnique('automations', ['id', 'trigger_type'], connection);
    },
  ),
  addTable('automation_trigger_rules', {
    id: { type: 'string', maxlength: 24, nullable: false, primary: true },
    automation_id: { type: 'string', maxlength: 24, nullable: false },
    trigger_type: {
      type: 'string',
      maxlength: 50,
      nullable: false,
      validations: { isIn: [['membership_started', 'paid_subscription_changed']] },
    },
    from_scope: {
      type: 'string',
      maxlength: 50,
      nullable: true,
      validations: { isIn: [['all_paid', 'specific_tier']] },
    },
    from_product_id: {
      type: 'string',
      maxlength: 24,
      nullable: true,
      references: 'products.id',
    },
    to_scope: {
      type: 'string',
      maxlength: 50,
      nullable: false,
      validations: { isIn: [['free', 'all_paid', 'specific_tier']] },
    },
    to_product_id: {
      type: 'string',
      maxlength: 24,
      nullable: true,
      references: 'products.id',
    },
    '@@FOREIGN_KEYS@@': [
      {
        columns: ['automation_id', 'trigger_type'],
        references: { table: 'automations', columns: ['id', 'trigger_type'] },
        constraintName: 'automation_trigger_rules_automation_type_foreign',
        cascadeDelete: true,
      },
    ],
  }),
);
