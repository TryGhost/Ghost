const logging = require('@tryghost/logging');
const { createNonTransactionalMigration } = require('../../utils');
const {
  addIndex,
  addUnique,
  dropIndex,
  dropUnique,
  getIndexes,
} = require('../../../schema/commands');

const table = 'products_benefits';
const uniqueColumns = ['product_id', 'benefit_id'];
const leftoverIndexName = 'products_benefits_product_id_index';

module.exports = createNonTransactionalMigration(
  async function up(knex) {
    // Nothing stopped a tier from being linked to the same benefit twice, and
    // a duplicate would make adding the constraint fail. The grouped derived
    // table is materialised, which lets MySQL delete from the table it reads.
    const deleted = await knex(table)
      .whereNotIn(
        'id',
        knex
          .select('keep_id')
          .from(
            knex(table).min('id as keep_id').groupBy('product_id', 'benefit_id').as('first_links'),
          ),
      )
      .del();

    logging.info(`Deleted ${deleted} duplicate ${table} row(s)`);

    await addUnique(table, uniqueColumns, knex);

    // A previous down() leaves a standalone index behind (see below). InnoDB
    // drops the index it created for the foreign key itself once the
    // composite unique can serve the constraint, but not one we created, so
    // drop it here to keep a rolled-back-and-remigrated database in the same
    // shape as every other one.
    const indexes = await getIndexes(table, knex);

    if (indexes.includes(leftoverIndexName)) {
      await dropIndex(table, ['product_id'], knex);
    }
  },
  async function down(knex) {
    try {
      await dropUnique(table, uniqueColumns, knex);
    } catch (err) {
      // The composite unique ends up as the only index covering the
      // product_id FK: fresh installs create it that way, and on upgrades
      // InnoDB drops the FK's own index once the composite can serve the
      // constraint. MySQL won't drop the last index a foreign key depends on,
      // so re-add a single-column one when it objects.
      if (err.code === 'ER_DROP_INDEX_FK') {
        logging.warn(
          `Cannot drop unique constraint over ${table}(product_id, benefit_id) while it backs the foreign key, re-adding index for product_id`,
        );

        await addIndex(table, ['product_id'], knex);
        await dropUnique(table, uniqueColumns, knex);
        return;
      }

      throw err;
    }
  },
);
