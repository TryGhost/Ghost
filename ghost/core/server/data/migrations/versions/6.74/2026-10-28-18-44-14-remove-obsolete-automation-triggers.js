const logging = require('@tryghost/logging');
const {
  combineNonTransactionalMigrations,
  createDropColumnMigration,
  createDropNullableMigration,
  dropTables,
} = require('../../utils');

const migration = combineNonTransactionalMigrations(
  dropTables(['automation_trigger_tiers'], {
    automation_trigger_tiers: {
      automation_id: {
        type: 'string',
        maxlength: 24,
        nullable: false,
        references: 'automations.id',
        cascadeDelete: true,
      },
      product_id: {
        type: 'string',
        maxlength: 24,
        nullable: false,
        references: 'products.id',
      },
      '@@UNIQUE_CONSTRAINTS@@': [['automation_id', 'product_id']],
    },
  }),
  createDropColumnMigration('automations', 'trigger_tier_scope', {
    type: 'string',
    maxlength: 50,
    nullable: true,
    validations: { isIn: [['free', 'all_paid', 'selected_paid']] },
  }),
  createDropColumnMigration('automations', 'trigger_type', {
    type: 'string',
    maxlength: 50,
    // We will make this non-nullable as part of `down`.
    nullable: true,
    validations: { isIn: [['membership_started']] },
  }),
);

module.exports = {
  ...migration,

  async down(options) {
    const knex = options.connection;

    await migration.down(options);

    await knex('automations').update({ trigger_type: 'membership_started' });
    await createDropNullableMigration('automations', 'trigger_type').up(options);

    const automations = await knex('automations').select('id');
    // eslint-disable-next-line no-restricted-syntax -- Sites have at most 50 automations.
    for (const automation of automations) {
      const rules = await knex('automation_trigger_rules').where('automation_id', automation.id);
      let scope = null;
      if (rules.length === 0) {
        // The backfill emitted no rules for null scopes or selected-paid scopes
        // with no tiers. Their original configuration cannot be recovered.
        await knex('automations').where('id', automation.id).update({ trigger_tier_scope: null });
        continue;
      }
      if (rules.some((rule) => rule.trigger_type === 'free_signup')) {
        scope = 'free';
      } else if (rules.some((rule) => rule.scope === 'any_paid_tier')) {
        scope = 'all_paid';
      } else if (rules.some((rule) => rule.scope === 'specific_paid_tier')) {
        scope = 'selected_paid';
        const productIds = [...new Set(rules.map((rule) => rule.product_id).filter(Boolean))];
        if (productIds.length) {
          await knex('automation_trigger_tiers')
            .insert(
              productIds.map((productId) => ({
                automation_id: automation.id,
                product_id: productId,
              })),
            )
            .onConflict(['automation_id', 'product_id'])
            .ignore();
        }
      }
      await knex('automations').where('id', automation.id).update({ trigger_tier_scope: scope });
    }

    logging.info('Restored legacy automation trigger configuration');
  },
};
