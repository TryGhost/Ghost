const logging = require('@tryghost/logging');
const { createNonTransactionalMigration } = require('../../utils');
const { addIndex, dropIndex } = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
  async function up(knex) {
    await addIndex('automation_runs', ['automation_id', 'member_id'], knex);
  },
  async function down(knex) {
    try {
      await dropIndex('automation_runs', ['automation_id', 'member_id'], knex);
    } catch (err) {
      if (err.code === 'ER_DROP_INDEX_FK') {
        logging.error({
          message:
            'Error dropping index over automation_runs(automation_id, member_id), re-adding index for automation_id',
        });

        await addIndex('automation_runs', ['automation_id'], knex);
        await dropIndex('automation_runs', ['automation_id', 'member_id'], knex);
        return;
      }

      throw err;
    }
  },
);
