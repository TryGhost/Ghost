const logging = require('@tryghost/logging');
const ObjectId = require('bson-objectid');
const { createTransactionalMigration } = require('../../utils');

const BATCH_SIZE = 100;

// Legacy writers could change signup configuration after the initial snapshot.
// Reconcile once at cutover; all runtime writers now maintain the rules atomically.
module.exports = createTransactionalMigration(
  async function up(trx) {
    let lastId = '';
    let inserted = 0;
    let skipped = 0;

    // eslint-disable-next-line no-restricted-syntax -- Keyset pagination bounds each read to 100 rows.
    while (true) {
      const automations = await trx('automations as automation')
        .select('automation.id', 'automation.trigger_tier_scope')
        .where('automation.trigger_type', 'membership_started')
        .where('automation.id', '>', lastId)
        .orderBy('automation.id')
        .limit(BATCH_SIZE);
      if (automations.length === 0) {
        break;
      }
      lastId = automations[automations.length - 1].id;

      // eslint-disable-next-line no-restricted-syntax -- At most 100 automations per page; no unbounded result set.
      for (const automation of automations) {
        await trx('automation_trigger_rules').where('automation_id', automation.id).delete();
        const base = {
          automation_id: automation.id,
          trigger_type: 'membership_started',
          from_scope: null,
          from_product_id: null,
          to_product_id: null,
        };
        const scope = automation.trigger_tier_scope;
        if (scope === 'free' || scope === 'all_paid') {
          await trx('automation_trigger_rules').insert({
            ...base,
            id: ObjectId().toHexString(),
            to_scope: scope,
          });
          inserted += 1;
        } else if (scope === 'selected_paid') {
          // Page the legacy join table too: neither automation nor tier counts
          // impose an unbounded read or a single oversized INSERT.
          let lastProductId = '';
          let tierCount = 0;
          // eslint-disable-next-line no-restricted-syntax -- Keyset pagination bounds tier reads and inserts to 100 rows.
          while (true) {
            const tiers = await trx('automation_trigger_tiers')
              .select('product_id')
              .where('automation_id', automation.id)
              .where('product_id', '>', lastProductId)
              .orderBy('product_id')
              .limit(BATCH_SIZE);
            if (tiers.length === 0) {
              break;
            }
            await trx('automation_trigger_rules').insert(
              tiers.map(({ product_id: productId }) => ({
                ...base,
                id: ObjectId().toHexString(),
                to_scope: 'specific_tier',
                to_product_id: productId,
              })),
            );
            lastProductId = tiers[tiers.length - 1].product_id;
            tierCount += tiers.length;
          }
          inserted += tierCount;
          if (tierCount === 0) {
            skipped += 1;
            logging.warn(`No trigger tiers to backfill for automation ${automation.id}`);
          }
        } else {
          skipped += 1;
          if (scope === null) {
            logging.info(`Leaving unconfigured automation ${automation.id} without trigger rules`);
          } else {
            logging.warn(
              `Skipping unexpected trigger tier scope for automation ${automation.id}: ${scope}`,
            );
          }
        }
      }
    }

    logging.info(
      `Reconciled ${inserted} automation trigger rules; skipped ${skipped} unconfigured or invalid automations. Non-signup automations were left unchanged`,
    );
  },
  async function down() {
    // Removing individual copied rows could discard later user edits. The DDL
    // rollback drops the new table; the old configuration has never been changed.
    logging.info(
      'Keeping automation trigger rules until table rollback; legacy triggers are unchanged',
    );
  },
);
