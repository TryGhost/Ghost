import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import knex, { type Knex } from 'knex';
import { applyCardQuery } from '../../../core/server/models/posts-card-query';

const config = require('../../../core/shared/config');
const testUtils = require('../../utils');
beforeAll(testUtils.setup());
afterAll(testUtils.teardownDb);
const addon = { type: 'addon', addonHandle: 'podcast', blockName: 'episode' };
const content = (children: unknown[]) => JSON.stringify({ root: { type: 'root', children } });

for (const dialect of ['mysql', 'better-sqlite3']) {
  describe(`Card query structure (${dialect})`, function () {
    let db: Knex;
    beforeAll(async function () {
      db = knex(
        dialect === 'mysql'
          ? { client: 'mysql2', connection: config.get('database:connection') }
          : {
              client: 'better-sqlite3',
              connection: { filename: ':memory:' },
              useNullAsDefault: true,
            },
      );
      await db.schema.createTable('card_query_fixture', (table) => {
        table.integer('id').primary();
        table.text('lexical', 'longtext');
      });
    });
    afterAll(async function () {
      await db.schema.dropTableIfExists('card_query_fixture');
      await db.destroy();
    });

    it('matches only actual nodes on the children tree, including nested cards', async function () {
      await db('card_query_fixture').insert([
        { id: 1, lexical: content([addon]) },
        { id: 2, lexical: content([{ type: 'paragraph', children: [addon] }]) },
        {
          id: 3,
          lexical: content([
            { type: 'addon', addonHandle: 'other', blockName: 'episode', props: addon },
          ]),
        },
        {
          id: 4,
          lexical: content([
            { type: 'addon', addonHandle: 'podcast', blockName: 'other' },
            { ...addon, addonHandle: 'other' },
          ]),
        },
        { id: 5, lexical: content([{ type: 'text', text: JSON.stringify(addon) }]) },
        { id: 6, lexical: content([{ ...addon, addonHandle: 'Podcast' }]) },
        { id: 7, lexical: '{broken' },
        { id: 8, lexical: null },
        { id: 9, lexical: JSON.stringify({ root: 'not a node' }) },
        { id: 10, lexical: content([{ type: 'paragraph', children: { 0: addon } }]) },
        { id: 11, lexical: content([null, 1, 'not a node', []]) },
        { id: 12, lexical: JSON.stringify({ root: addon }) },
      ]);
      const query = db('card_query_fixture as posts').select('id').orderBy('id');
      applyCardQuery(query, 'addon:podcast:episode');
      expect(await query).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('requires string-valued identities on both databases', async function () {
      await db('card_query_fixture').insert([
        { id: 20, lexical: content([{ ...addon, addonHandle: null }]) },
        { id: 21, lexical: content([{ ...addon, blockName: 123 }]) },
        { id: 22, lexical: content([{ ...addon, addonHandle: 'null' }]) },
        { id: 23, lexical: content([{ ...addon, blockName: '123' }]) },
        { id: 24, lexical: content([{ ...addon, addonHandle: true }]) },
        { id: 25, lexical: content([{ ...addon, addonHandle: 'true' }]) },
      ]);
      for (const [selector, id] of [
        ['addon:null:episode', 22],
        ['addon:podcast:123', 23],
        ['addon:true:episode', 25],
      ] as const) {
        const query = db('card_query_fixture as posts').select('id').orderBy('id');
        applyCardQuery(query, selector);
        expect(await query).toEqual([{ id }]);
      }
    });
  });
}
