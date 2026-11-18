import assert from 'node:assert/strict';
import { afterAll, beforeAll, describe, it } from 'vitest';
import type { BetterAuthOptions } from 'better-auth/types';
import knex from 'knex';
import config from '../../../core/shared/config';
import { configure, type DatabaseConfig } from '../../../core/server/data/db/configure-knex';
import { createKnexAdapter } from '../../../core/server/auth/better-auth/knex-adapter';

const dbConfig = config.get('database') as DatabaseConfig;
const database = `${(dbConfig.connection as { database: string }).database}_proj`;
const db = knex(configure({ ...dbConfig, connection: { ...dbConfig.connection, database } }));
const options: BetterAuthOptions = {
  advanced: { database: { joins: true, generateId: () => '000000000000000000000099' } },
  plugins: [
    {
      id: 'projection-regression',
      schema: {
        parent: {
          modelName: 'projection_parents',
          fields: {
            label: { type: 'string' },
            rank: { type: 'number', fieldName: 'sort_rank' },
          },
        },
        child: {
          modelName: 'projection_children',
          fields: {
            label: { type: 'string' },
            parentId: {
              type: 'string',
              fieldName: 'parent_id',
              references: { model: 'parent', field: 'id' },
            },
          },
        },
      },
    },
  ],
};
const adapter = createKnexAdapter({ db })(options);
const firstParent = '000000000000000000000001';
const secondParent = '000000000000000000000002';
const firstChild = '000000000000000000000003';
const secondChild = '000000000000000000000004';

describe('Knex adapter: joined projections', () => {
  beforeAll(async () => {
    const admin = knex(
      configure({ ...dbConfig, connection: { ...dbConfig.connection, database: undefined } }),
    );
    try {
      await admin.raw('CREATE DATABASE ??', [database]);
    } finally {
      await admin.destroy();
    }
    await db.schema.createTable('projection_parents', (t) => {
      t.string('id', 24).primary();
      t.string('label');
      t.integer('sort_rank');
    });
    await db.schema.createTable('projection_children', (t) => {
      t.string('id', 24).primary();
      t.string('label');
      t.string('parent_id', 24);
    });
    for (const data of [
      { id: firstParent, label: 'First parent', rank: 2 },
      { id: secondParent, label: 'Second parent', rank: 1 },
    ]) {
      await adapter.create({ model: 'parent', data, forceAllowId: true });
    }
    for (const data of [
      { id: firstChild, label: 'First child', parentId: firstParent },
      { id: secondChild, label: 'Second child', parentId: secondParent },
    ]) {
      await adapter.create({ model: 'child', data, forceAllowId: true });
    }
  });

  afterAll(async () => {
    await db.raw('DROP DATABASE IF EXISTS ??', [database]);
    await db.destroy();
  });

  it('sorts and paginates joined rows by a field outside the projection', async () => {
    const rows = await adapter.findMany({
      model: 'parent',
      select: ['label'],
      sortBy: { field: 'rank', direction: 'asc' },
      limit: 1,
      offset: 1,
      join: { child: true },
    });

    assert.deepEqual(JSON.parse(JSON.stringify(rows)), [
      {
        id: firstParent,
        label: 'First parent',
        child: [{ id: firstChild, label: 'First child', parentId: firstParent }],
      },
    ]);
  });

  it('keeps each child with its own parent when the child id is not selected', async () => {
    const rows = await adapter.findMany({
      model: 'child',
      select: ['label'],
      join: { parent: true },
    });

    assert.deepEqual(
      JSON.parse(JSON.stringify(rows)).sort((a: { label: string }, b: { label: string }) =>
        a.label.localeCompare(b.label),
      ),
      [
        {
          label: 'First child',
          parentId: firstParent,
          parent: { id: firstParent, label: 'First parent', rank: 2 },
        },
        {
          label: 'Second child',
          parentId: secondParent,
          parent: { id: secondParent, label: 'Second parent', rank: 1 },
        },
      ],
    );
  });
});
