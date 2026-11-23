import { addForeign, dropForeign } from '../../../schema/commands';
import logging from '@tryghost/logging';
import { createTransactionalMigration } from '../../utils';

export default createTransactionalMigration(
  async function up(knex) {
    logging.info('Adding on delete CASCADE for comments parent_id');

    await dropForeign({
      fromTable: 'comments',
      fromColumn: 'parent_id',
      toTable: 'comments',
      toColumn: 'id',
      transaction: knex,
    });

    await addForeign({
      fromTable: 'comments',
      fromColumn: 'parent_id',
      toTable: 'comments',
      toColumn: 'id',
      cascadeDelete: true,
      transaction: knex,
    });
  },
  async function down(knex) {
    logging.info('Restoring foreign key for comments parent_id');

    await dropForeign({
      fromTable: 'comments',
      fromColumn: 'parent_id',
      toTable: 'comments',
      toColumn: 'id',
      transaction: knex,
    });

    await addForeign({
      fromTable: 'comments',
      fromColumn: 'parent_id',
      toTable: 'comments',
      toColumn: 'id',
      transaction: knex,
    });
  },
);
