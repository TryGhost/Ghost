import assert from 'node:assert/strict';
import { afterAll, beforeAll, describe, it } from 'vitest';
import type { BetterAuthOptions } from 'better-auth/types';
import knex from 'knex';
import config from '../../../core/shared/config';
import { configure, type DatabaseConfig } from '../../../core/server/data/db/configure-knex';
import { createKnexAdapter } from '../../../core/server/auth/better-auth/knex-adapter';

const dbConfig = config.get('database') as DatabaseConfig;
const database = `${(dbConfig.connection as { database: string }).database}_alias`;
const db = knex(configure({ ...dbConfig, connection: { ...dbConfig.connection, database } }));
const options = {
  advanced: { database: { joins: true, generateId: () => '000000000000000000000099' } },
  plugins: [
    {
      id: 'join-alias-regression',
      schema: {
        bundle: {
          modelName: 'alias_bundles',
          fields: { code: { type: 'string', unique: true, fieldName: 'public_code' } },
        },
        entry: {
          modelName: 'alias_entries',
          fields: {
            bundleCode: {
              type: 'string',
              fieldName: 'bundle_code',
              references: { model: 'bundle', field: 'code' },
            },
            label: { type: 'string' },
          },
        },
        note: {
          modelName: 'alias',
          fields: {
            bundleCode: {
              type: 'string',
              fieldName: 'bundle_code',
              references: { model: 'bundle', field: 'code' },
            },
            label: { type: 'string', fieldName: 'entries_id' },
          },
        },
      },
    },
  ],
} satisfies BetterAuthOptions;
const adapter = createKnexAdapter({ db })(options);
const collisionAdapter = createKnexAdapter({
  db,
  virtualColumns: {
    alias_bundles: { _j2_alias_entries_id: (executor) => executor.raw('?', ['Virtual']) },
  },
})({
  ...options,
  plugins: [
    {
      ...options.plugins[0],
      schema: {
        ...options.plugins[0].schema,
        bundle: {
          ...options.plugins[0].schema.bundle,
          fields: {
            ...options.plugins[0].schema.bundle.fields,
            title: { type: 'string', fieldName: '_joined_13_alias_entries_id' },
            first: { type: 'string', fieldName: '_j0_alias_entries_id' },
            second: { type: 'string', fieldName: '_j1_alias_entries_id' },
            computed: { type: 'string', fieldName: '_j2_alias_entries_id' },
          },
        },
      },
    },
  ],
});
const bundle = { id: '000000000000000000000001', code: 'public-bundle' };
const collisionBundle = {
  ...bundle,
  title: 'Bundle',
  first: 'First',
  second: 'Second',
  computed: 'Virtual',
};
const entry = { id: '000000000000000000000002', bundleCode: bundle.code, label: 'Entry' };
const note = { id: '000000000000000000000003', bundleCode: bundle.code, label: 'Note' };
let created = false;

describe('Knex adapter: simultaneous joins with overlapping mapped names', () => {
  beforeAll(async () => {
    const admin = knex(
      configure({ ...dbConfig, connection: { ...dbConfig.connection, database: undefined } }),
    );
    try {
      await admin.raw('CREATE DATABASE ??', [database]);
      created = true;
    } finally {
      await admin.destroy();
    }
    await db.schema.createTable('alias_bundles', (t) => {
      t.string('id', 24).primary();
      t.string('public_code', 64).unique();
      t.string('_joined_13_alias_entries_id').defaultTo('Bundle');
      t.string('_j0_alias_entries_id').defaultTo('First');
      t.string('_j1_alias_entries_id').defaultTo('Second');
      // This physical column is deliberately absent from the public schema.
      t.string('_j3_alias_entries_id').defaultTo('Unmapped');
    });
    for (const name of ['alias_entries', 'alias']) {
      await db.schema.createTable(name, (t) => {
        t.string('id', 24).primary();
        t.string('bundle_code', 64).references('public_code').inTable('alias_bundles');
        t.string(name === 'alias' ? 'entries_id' : 'label');
      });
    }
    await adapter.create({ model: 'bundle', data: bundle, forceAllowId: true });
    await adapter.create({ model: 'entry', data: entry, forceAllowId: true });
    await adapter.create({ model: 'note', data: note, forceAllowId: true });
  });
  afterAll(async () => {
    try {
      if (created) {
        await db.raw('DROP DATABASE ??', [database]);
      }
    } finally {
      await db.destroy();
    }
  });

  it('preserves each joined id and payload when table and column mappings overlap', async () => {
    const rows = await adapter.findMany({ model: 'bundle', join: { entry: true, note: true } });
    assert.deepEqual(JSON.parse(JSON.stringify(rows)), [
      { ...bundle, entry: [entry], note: [note] },
    ]);
  });

  it('preserves mapped fields in findOne when the join order is reversed', async () => {
    const row = await adapter.findOne({
      model: 'bundle',
      where: [{ field: 'id', value: bundle.id }],
      join: { note: true, entry: true },
    });
    assert.deepEqual(JSON.parse(JSON.stringify(row)), {
      ...bundle,
      entry: [entry],
      note: [note],
    });
  });

  it.each(['findOne', 'findMany'] as const)(
    'preserves base fields resembling joined columns across join order and projection in %s',
    async (method) => {
      for (const join of [
        { entry: true, note: true },
        { note: true, entry: true },
      ]) {
        for (const select of [undefined, ['id', 'code', 'title', 'computed']]) {
          const args = {
            model: 'bundle',
            where: [{ field: 'id', value: bundle.id }],
            join,
            select,
          };
          const rows =
            method === 'findOne'
              ? [await collisionAdapter.findOne(args)]
              : await collisionAdapter.findMany(args);
          assert.deepEqual(JSON.parse(JSON.stringify(rows)), [
            {
              ...(select ? { ...bundle, title: 'Bundle', computed: 'Virtual' } : collisionBundle),
              entry: [entry],
              note: [note],
            },
          ]);
        }
      }
    },
  );
});
