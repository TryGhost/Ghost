const logging = require('@tryghost/logging');
const { createNonTransactionalMigration } = require('../../utils');

// Commit each bounded batch independently, so restart can resume partial work.
// DML only: schema changes live in the preceding and following migrations.
const BATCH_SIZE = 1000;
module.exports = createNonTransactionalMigration(
  async function up(knex) {
    let afterId = '';
    let count = 0;
    // eslint-disable-next-line no-restricted-syntax -- Keyset pagination advances through bounded 1,000-row batches; measured on 50,000 rows.
    while (true) {
      const rows = await knex('automation_run_steps')
        .select('id')
        .where('id', '>', afterId)
        .whereNull('automation_id')
        .orderBy('id')
        .limit(BATCH_SIZE);
      if (rows.length === 0) {
        break;
      }
      await knex('automation_run_steps')
        .whereIn(
          'id',
          rows.map((row) => row.id),
        )
        .whereNull('automation_id')
        .update({
          automation_id: knex('automation_runs')
            .select('automation_id')
            .where('automation_runs.id', knex.ref('automation_run_steps.automation_run_id')),
        });
      afterId = rows[rows.length - 1].id;
      count += rows.length;
    }
    logging.info(`Backfilled automation_id on ${count} automation run steps`);
  },
  async function down() {
    // Preserve derived values. The preceding column migration removes them.
    logging.info('Keeping derived automation run step automation_id values until column rollback');
  },
);
