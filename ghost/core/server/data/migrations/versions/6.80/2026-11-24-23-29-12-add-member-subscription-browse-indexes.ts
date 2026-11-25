import logging from '@tryghost/logging';
import DatabaseInfo from '@tryghost/database-info';
import type { Knex } from 'knex';
import { addIndex, dropIndex } from '../../../schema/commands';
import { createNonTransactionalMigration } from '../../utils';

const memberColumns = ['status', 'email_disabled'];
const subscriptionColumns = ['member_id', 'newsletter_id'];

async function restoreMemberForeignKeyIndex(knex: Knex) {
  // InnoDB may have removed its implicit foreign-key index when it found
  // that the new composite index covers the foreign key.
  const [indexes] = await knex.raw(
    'SHOW INDEX FROM members_newsletters WHERE Column_name = ? AND Seq_in_index = 1 AND Key_name <> ?',
    ['member_id', 'members_newsletters_member_id_newsletter_id_index'],
  );
  if (indexes.length === 0) {
    logging.info('Restoring the index for members_newsletters.member_id foreign key');
    await knex.raw(
      'ALTER TABLE members_newsletters ADD INDEX members_newsletters_member_id_foreign (member_id), ALGORITHM=INPLACE, LOCK=NONE',
    );
  } else {
    logging.info('Skipping restore of the index for members_newsletters.member_id foreign key');
  }
}

async function dropRestoredMemberForeignKeyIndex(knex: Knex) {
  // A rollback re-adds this index explicitly, so InnoDB keeps it when the
  // composite index comes back on a later migration.
  const [indexes] = await knex.raw('SHOW INDEX FROM members_newsletters WHERE Key_name = ?', [
    'members_newsletters_member_id_foreign',
  ]);
  if (indexes.length === 1 && indexes[0].Column_name === 'member_id') {
    logging.info('Dropping the restored index for members_newsletters.member_id foreign key');
    await knex.raw(
      'ALTER TABLE members_newsletters DROP INDEX members_newsletters_member_id_foreign, ALGORITHM=INPLACE, LOCK=NONE',
    );
  } else {
    logging.info(
      'Skipping drop of the restored index for members_newsletters.member_id foreign key',
    );
  }
}

async function changeIndex(knex: Knex, table: string, columns: string[], action: 'add' | 'drop') {
  if (!DatabaseInfo.isMySQL(knex)) {
    await (action === 'add' ? addIndex : dropIndex)(table, columns, knex);
    return;
  }

  const name = `${table}_${columns.join('_')}_index`;
  const [existing] = await knex.raw('SHOW INDEX FROM ?? WHERE Key_name = ?', [table, name]);
  const exists = existing.length > 0;
  if (action === 'add' ? exists : !exists) {
    logging.info(`Skipping ${action} of index ${name}`);
    return;
  }

  logging.info(`Applying ${action} for index ${name}`);
  if (action === 'add') {
    await knex.raw(
      'ALTER TABLE ?? ADD INDEX ?? (' +
        columns.map(() => '??').join(', ') +
        '), ALGORITHM=INPLACE, LOCK=NONE',
      [table, name, ...columns],
    );
  } else {
    if (table === 'members_newsletters') {
      await restoreMemberForeignKeyIndex(knex);
    }
    await knex.raw('ALTER TABLE ?? DROP INDEX ??, ALGORITHM=INPLACE, LOCK=NONE', [table, name]);
  }
}

export default createNonTransactionalMigration(
  async (knex) => {
    await changeIndex(knex, 'members', memberColumns, 'add');
    await changeIndex(knex, 'members_newsletters', subscriptionColumns, 'add');
    if (DatabaseInfo.isMySQL(knex)) {
      await dropRestoredMemberForeignKeyIndex(knex);
    }
  },
  async (knex) => {
    await changeIndex(knex, 'members_newsletters', subscriptionColumns, 'drop');
    await changeIndex(knex, 'members', memberColumns, 'drop');
  },
);
