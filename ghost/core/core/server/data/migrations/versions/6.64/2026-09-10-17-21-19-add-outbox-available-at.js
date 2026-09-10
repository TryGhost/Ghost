const {
  combineNonTransactionalMigrations,
  createAddColumnMigration,
  createNonTransactionalMigration,
} = require('../../utils');
const { addIndex, dropIndex } = require('../../../schema/commands');

const columns = ['event_type', 'status', 'available_at', 'id'];

module.exports = combineNonTransactionalMigrations(
  createAddColumnMigration('outbox', 'available_at', { type: 'dateTime', nullable: true }),
  createNonTransactionalMigration(
    async (knex) => {
      await addIndex('outbox', columns, knex);
    },
    async (knex) => {
      await dropIndex('outbox', columns, knex);
    },
  ),
);
