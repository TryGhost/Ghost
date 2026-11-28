import logging from '@tryghost/logging';
import DatabaseInfo from '@tryghost/database-info';
import type { Knex } from 'knex';
import { addIndex, dropIndex } from '../../../schema/commands';
import { createNonTransactionalMigration } from '../../utils';

const membersColumns = ['status', 'email_disabled'];
const subscriptionsColumns = ['member_id', 'newsletter_id'];
const memberIdIndex = 'members_newsletters_member_id_foreign';

async function hasMemberIdIndex(knex: Knex) {
  const [indexes] = await knex.raw('SHOW INDEX FROM members_newsletters WHERE Key_name = ?', [
    memberIdIndex,
  ]);
  return indexes.length > 0;
}

// InnoDB drops its implicit member_id foreign-key index once the composite index
// covers it, but keeps the explicit one a rollback re-adds.
async function dropMemberIdIndex(knex: Knex) {
  if (!DatabaseInfo.isMySQL(knex) || !(await hasMemberIdIndex(knex))) {
    logging.info(`Skipping drop of index ${memberIdIndex} - not present`);
    return;
  }

  logging.info(`Dropping index ${memberIdIndex} - covered by the composite index`);
  await knex.schema.alterTable('members_newsletters', (table) => {
    table.dropIndex([], memberIdIndex);
  });
}

// InnoDB refuses to drop the composite index while no other index covers the foreign key.
async function restoreMemberIdIndex(knex: Knex) {
  if (!DatabaseInfo.isMySQL(knex) || (await hasMemberIdIndex(knex))) {
    logging.info(`Skipping restore of index ${memberIdIndex} - not needed`);
    return;
  }

  logging.info(`Restoring index ${memberIdIndex} for the member_id foreign key`);
  await knex.schema.alterTable('members_newsletters', (table) => {
    table.index(['member_id'], memberIdIndex);
  });
}

export default createNonTransactionalMigration(
  async (knex) => {
    await addIndex('members', membersColumns, knex);
    await addIndex('members_newsletters', subscriptionsColumns, knex);
    await dropMemberIdIndex(knex);
  },
  async (knex) => {
    await restoreMemberIdIndex(knex);
    await dropIndex('members_newsletters', subscriptionsColumns, knex);
    await dropIndex('members', membersColumns, knex);
  },
);
