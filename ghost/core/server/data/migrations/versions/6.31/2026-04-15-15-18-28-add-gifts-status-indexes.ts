import { createNonTransactionalMigration } from '../../utils';
import { addIndex, dropIndex } from '../../../schema/commands';

export default createNonTransactionalMigration(
  async function up(knex) {
    await addIndex('gifts', ['status', 'consumes_at'], knex);
    await addIndex('gifts', ['status', 'expires_at'], knex);
  },
  async function down(knex) {
    await dropIndex('gifts', ['status', 'consumes_at'], knex);
    await dropIndex('gifts', ['status', 'expires_at'], knex);
  },
);
