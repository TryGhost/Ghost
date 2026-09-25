const { createNonTransactionalMigration } = require('../../utils');
const { addIndex, dropIndex } = require('../../../schema/commands');

const table = 'automation_runs';
const columns = ['automation_id', 'id', 'member_id'];

// Search counts traverse one automation by run ID and then match its members.
// Cover each bounded window without sorting the automation's remaining history.
module.exports = createNonTransactionalMigration(
  async function up(knex) {
    await addIndex(table, columns, knex);
  },
  async function down(knex) {
    await dropIndex(table, columns, knex);
  },
);
