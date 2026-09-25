const assert = require('node:assert/strict');
const knex = require('knex');
const migration = require('../../../../../core/server/data/migrations/versions/6.66/2026-09-24-17-37-43-add-automation-member-search-count-index');

// Keep the retained SQLite path executable; the integration migration suite
// exercises initialization, rollback and replay against MySQL.
describe('Automation member search count index on SQLite', function () {
  it('adds and removes the covering index idempotently without changing runs', async function () {
    const db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    const row = { id: 'run', automation_id: 'automation', member_id: null };
    const indexName = 'automation_runs_automation_id_id_member_id_index';
    try {
      await db.schema.createTable('automation_runs', (table) => {
        table.string('id').primary();
        table.string('automation_id');
        table.string('member_id').nullable();
      });
      await db('automation_runs').insert(row);
      await migration.up({ connection: db });
      await migration.up({ connection: db });
      const columns = await db.raw(`PRAGMA index_info(${indexName})`);
      assert.deepEqual(
        columns.map((column) => column.name),
        ['automation_id', 'id', 'member_id'],
      );
      await migration.down({ connection: db });
      await migration.down({ connection: db });
      assert.deepEqual(await db.raw(`PRAGMA index_info(${indexName})`), []);
      await migration.up({ connection: db });
      assert.deepEqual(await db('automation_runs').select('*'), [row]);
    } finally {
      await db.destroy();
    }
  });
});
