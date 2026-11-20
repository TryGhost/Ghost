import logging from '@tryghost/logging';
import { createNonTransactionalMigration } from '../../utils';
import { addColumn, addIndex, dropColumn, dropIndex } from '../../../schema/commands';

const columnDefinition: any = {
  type: 'dateTime',
  nullable: true,
};

export default createNonTransactionalMigration(
  async function up(knex) {
    const hasPinnedAtColumn = await knex.schema.hasColumn('comments', 'pinned_at');
    if (hasPinnedAtColumn) {
      logging.warn('Adding comments.pinned_at column - skipping as column already exists');
    } else {
      logging.info('Adding comments.pinned_at column');
      await addColumn('comments', 'pinned_at', knex, columnDefinition);
    }

    await addIndex('comments', ['post_id', 'parent_id', 'pinned_at'], knex);
  },
  async function down(knex) {
    // The composite [post_id, parent_id, pinned_at] index is the only one
    // covering the post_id FK on comments. Add a single-column [post_id]
    // index back before dropping the composite, otherwise MySQL refuses
    // with "needed in a foreign key constraint".
    await addIndex('comments', ['post_id'], knex);
    await dropIndex('comments', ['post_id', 'parent_id', 'pinned_at'], knex);

    const hasPinnedAtColumn = await knex.schema.hasColumn('comments', 'pinned_at');
    if (!hasPinnedAtColumn) {
      logging.warn('Removing comments.pinned_at column - skipping as column does not exist');
      return;
    }

    logging.info('Removing comments.pinned_at column');
    await dropColumn('comments', 'pinned_at', knex, columnDefinition);
  },
);
