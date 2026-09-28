import assert from 'node:assert/strict';
import createKnex from 'knex';
import { whereProviderMessageIds } from '../../../../../core/server/services/lib/where-provider-message-id';

describe('provider message ID batch matching', () => {
  it('keeps the MySQL index predicate and compares opaque IDs as binary values', async () => {
    const knex = createKnex({ client: 'mysql2' });
    try {
      const ids = ['<Mixed-Case>', "quote' OR 1=1", 'id '];
      const query = knex('email_batches')
        .modify(whereProviderMessageIds, 'mailgun_message_id', ids)
        .toSQL();
      assert.equal(
        query.sql,
        'select * from `email_batches` where `mailgun_message_id` in (?, ?, ?) and BINARY `mailgun_message_id` IN (BINARY ?, BINARY ?, BINARY ?)',
      );
      assert.deepEqual(query.bindings, [...ids, ...ids]);
      const empty = knex('email_batches')
        .modify(whereProviderMessageIds, 'mailgun_message_id', [])
        .toSQL();
      assert.equal(empty.sql, 'select * from `email_batches` where 1 = ?');
      assert.deepEqual(empty.bindings, [0]);
    } finally {
      await knex.destroy();
    }
  });
  it('uses SQLite native case-sensitive comparisons', async () => {
    const knex = createKnex({ client: 'sqlite3', useNullAsDefault: true });
    try {
      const query = knex('email_batches')
        .modify(whereProviderMessageIds, 'mailgun_message_id', ['ID'])
        .toSQL();
      assert.equal(query.sql, 'select * from `email_batches` where `mailgun_message_id` in (?)');
      assert.deepEqual(query.bindings, ['ID']);
    } finally {
      await knex.destroy();
    }
  });
});
