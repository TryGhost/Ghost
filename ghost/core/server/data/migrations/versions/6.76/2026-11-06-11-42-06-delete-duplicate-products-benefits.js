const logging = require('@tryghost/logging');
const { createTransactionalMigration } = require('../../utils');

const table = 'products_benefits';

module.exports = createTransactionalMigration(
  async function up(knex) {
    // Nothing stopped a tier from being linked to the same benefit twice, and
    // a duplicate would make the next migration's unique constraint fail. The
    // grouped derived table is materialised, which lets MySQL delete from the
    // table it reads.
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
  },
  async function down() {
    logging.info(`Not restoring duplicate ${table} rows`);
  },
);
