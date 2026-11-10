import assert from 'node:assert/strict';
import createKnex from 'knex';

const migration = require('../../../../../core/server/data/migrations/versions/6.77/2026-11-10-16-36-41-backfill-run-step-automation-ids');

describe('backfill run step automation IDs', function () {
  it('backfills multiple batches, resumes partial work, and preserves values on rollback', async function () {
    const knex = createKnex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    try {
      await knex.schema.createTable('automation_runs', (table) => {
        table.string('id').primary();
        table.string('automation_id').notNullable();
      });
      await knex.schema.createTable('automation_run_steps', (table) => {
        table.string('id').primary();
        table.string('automation_run_id').notNullable();
        table.string('automation_id').nullable();
      });
      await knex('automation_runs').insert([
        { id: 'run-a', automation_id: 'a' },
        { id: 'run-b', automation_id: 'b' },
      ]);
      const rows = Array.from({ length: 2003 }, (_, index) => ({
        id: String(index).padStart(5, '0'),
        automation_run_id: index % 2 ? 'run-a' : 'run-b',
        automation_id: index === 1001 ? 'a' : null,
      }));
      await knex.batchInsert('automation_run_steps', rows, 100);
      await migration.up({ connection: knex });
      const expected = rows.map((row) => ({
        ...row,
        automation_id: row.automation_run_id === 'run-a' ? 'a' : 'b',
      }));
      assert.deepEqual(await knex('automation_run_steps').orderBy('id'), expected);
      await migration.up({ connection: knex });
      await migration.down({ connection: knex });
      assert.deepEqual(await knex('automation_run_steps').orderBy('id'), expected);
    } finally {
      await knex.destroy();
    }
  });
});
