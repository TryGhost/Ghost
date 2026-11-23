import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import * as commands from '../../../core/server/data/schema/commands';
import { type SortableDefinition, sortableBy } from '../../../core/server/data/schema/lib/sortable';
import type { TableDefinition } from '../../../core/server/data/schema/types';
import { sortable, sortableIn } from '../../../core/server/lib/sortable';

const testUtils = require('../../utils');
const knex: Knex = require('../../../core/server/data/db').knex;

const VIEWS = 'test_sortable_views';
const TAGS = 'test_sortable_post_tags';
const PLAIN = 'test_sortable_plain';

const idColumn = { type: 'string', maxlength: 24, nullable: false, primary: true } as const;
const position = { type: 'integer', nullable: false, unsigned: true, defaultTo: 0 } as const;

// Scratch tables declared as the schema declares Ghost's: one collection that is the whole
// table, a table with two collections scoped to a parent, and a table with none.
const TABLES = {
  [VIEWS]: {
    id: idColumn,
    name: { type: 'string', maxlength: 191, nullable: false },
    sort_order: position,
    created_at: { type: 'dateTime', nullable: false },
    '@@SORTABLE@@': [sortableBy({ column: 'sort_order', tieBreak: ['created_at', 'id'] })],
  },
  [TAGS]: {
    id: idColumn,
    post_id: { type: 'string', maxlength: 24, nullable: false },
    tag_id: { type: 'string', maxlength: 24, nullable: true },
    sort_order: position,
    pinned_order: position,
    // As on a link table. MySQL reads a parent's rows through this index, in `tag_id` order.
    '@@INDEXES@@': [['post_id', 'tag_id']],
    '@@SORTABLE@@': [
      sortableBy({ column: 'sort_order', within: 'post_id', tieBreak: ['id'] }),
      sortableBy({ column: 'pinned_order', within: 'post_id', tieBreak: [] }),
    ],
  },
  [PLAIN]: { id: idColumn },
} satisfies Record<string, TableDefinition>;

const collections = sortableIn(TABLES);
const views = collections(VIEWS, 'sort_order');
const tags = collections(TAGS, 'sort_order');

describe('A sortable collection', function () {
  const names = async (db: Knex = knex) => views.inOrder(db, {}).pluck('name');
  const tagsOf = async (postId: string) => tags.inOrder(knex, { post_id: postId }).pluck('id');

  async function addView(id: string, createdAt = '2026-01-01 00:00:00', db: Knex = knex) {
    await db(VIEWS).insert({ id, name: id, created_at: createdAt });
    await views.append(db, {}, id);
  }

  // Other files share this database, and what they leave in it can fail the setup.
  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup());

  beforeEach(async function () {
    await knex.schema.dropTableIfExists(VIEWS);
    await knex.schema.dropTableIfExists(TAGS);
    await commands.createTable(VIEWS, knex, TABLES[VIEWS]);
    await commands.createTable(TAGS, knex, TABLES[TAGS]);
  });

  afterAll(async function () {
    await knex.schema.dropTableIfExists(VIEWS);
    await knex.schema.dropTableIfExists(TAGS);
  });

  describe('read in order', function () {
    it('orders rows by position', async function () {
      await knex(VIEWS).insert([
        { id: 'c', name: 'third', sort_order: 2, created_at: '2026-01-01 00:00:00' },
        { id: 'a', name: 'first', sort_order: 0, created_at: '2026-01-03 00:00:00' },
        { id: 'b', name: 'second', sort_order: 1, created_at: '2026-01-02 00:00:00' },
      ]);

      assert.deepEqual(await names(), ['first', 'second', 'third']);
    });

    it('orders rows that tie on every declared column by id', async function () {
      // The index would return these in `tag_id` order, which is the reverse of their ids.
      await knex(TAGS).insert([
        { id: 'c', post_id: 'post-1', tag_id: 'tag-1' },
        { id: 'a', post_id: 'post-1', tag_id: 'tag-3' },
        { id: 'b', post_id: 'post-1', tag_id: 'tag-2' },
      ]);
      const pinned = collections(TAGS, 'pinned_order');

      assert.deepEqual(await pinned.inOrder(knex, { post_id: 'post-1' }).pluck('id'), [
        'a',
        'b',
        'c',
      ]);
    });

    it('orders rows with the same position by the tie-break columns, in turn', async function () {
      await knex(VIEWS).insert([
        { id: 'b', name: 'later', created_at: '2026-01-02 00:00:00' },
        { id: 'z', name: 'earlier, higher id', created_at: '2026-01-01 00:00:00' },
        { id: 'a', name: 'earlier, lower id', created_at: '2026-01-01 00:00:00' },
      ]);

      assert.deepEqual(await names(), ['earlier, lower id', 'earlier, higher id', 'later']);
    });

    it("reads only the parent's rows", async function () {
      await knex(TAGS).insert([
        { id: 'b', post_id: 'post-1', sort_order: 1 },
        { id: 'x', post_id: 'post-2', sort_order: 0 },
        { id: 'a', post_id: 'post-1', sort_order: 0 },
      ]);

      assert.deepEqual(await tagsOf('post-1'), ['a', 'b']);
      assert.deepEqual(await tagsOf('post-2'), ['x']);
    });

    it('lets the caller add to the query, a join on the parent column included', async function () {
      await addView('post-1');
      await knex(TAGS).insert([
        { id: 'b', post_id: 'post-1', sort_order: 1 },
        { id: 'a', post_id: 'post-1', sort_order: 0 },
      ]);

      const rows: unknown = await tags
        .inOrder(knex, { post_id: 'post-1' })
        .join(VIEWS, `${VIEWS}.id`, `${TAGS}.post_id`)
        .whereNot(`${TAGS}.id`, 'a')
        .select(`${TAGS}.id`, `${VIEWS}.name`);

      assert.deepEqual(rows, [{ id: 'b', name: 'post-1' }]);
    });
  });

  describe('append', function () {
    it('puts each new row after the others', async function () {
      await addView('first');
      await addView('second');
      await addView('third');

      assert.deepEqual(await names(), ['first', 'second', 'third']);
    });

    it('puts a row after others that still have the default position', async function () {
      await knex(VIEWS).insert([
        { id: 'old-1', name: 'old-1', created_at: '2026-01-01 00:00:00' },
        { id: 'old-2', name: 'old-2', created_at: '2026-01-02 00:00:00' },
      ]);

      // Created before the others, so only its position can put it last.
      await addView('new', '2025-01-01 00:00:00');

      assert.deepEqual(await names(), ['old-1', 'old-2', 'new']);
    });

    it("puts a row after the parent's other rows, whatever other parents hold", async function () {
      await knex(TAGS).insert([
        { id: 'x', post_id: 'post-2', sort_order: 7 },
        { id: 'b', post_id: 'post-1', sort_order: 3 },
        { id: 'a', post_id: 'post-1' },
      ]);

      await tags.append(knex, { post_id: 'post-1' }, 'a');

      assert.deepEqual(await tagsOf('post-1'), ['b', 'a']);
      assert.deepEqual(await knex(TAGS).where('id', 'a').pluck('sort_order'), [4]);
    });
  });

  describe('reorder', function () {
    beforeEach(async function () {
      await addView('first');
      await addView('second');
      await addView('third');
    });

    it('replaces the whole order', async function () {
      await views.reorder(knex, {}, ['third', 'first', 'second']);

      assert.deepEqual(await names(), ['third', 'first', 'second']);
    });

    it("leaves other parents' rows as they are", async function () {
      await knex(TAGS).insert([
        { id: 'a', post_id: 'post-1', sort_order: 0 },
        { id: 'b', post_id: 'post-1', sort_order: 1 },
        { id: 'x', post_id: 'post-2', sort_order: 5 },
      ]);

      await tags.reorder(knex, { post_id: 'post-1' }, ['b', 'a']);

      assert.deepEqual(await tagsOf('post-1'), ['b', 'a']);
      assert.deepEqual(await knex(TAGS).where('id', 'x').pluck('sort_order'), [5]);
    });

    it.each([
      ['leaves a row out', ['third', 'first']],
      ['has a row twice', ['third', 'first', 'second', 'first']],
      ['has a row that is not in the collection', ['third', 'first', 'second', 'fourth']],
      ['swaps a row for one that is not in the collection', ['third', 'first', 'fourth']],
    ])('rejects an order that %s, and changes nothing', async function (_case, order) {
      await assert.rejects(views.reorder(knex, {}, order), {
        name: 'ValidationError',
        message: 'The order must include every item exactly once. Reload and try again.',
      });

      assert.deepEqual(await names(), ['first', 'second', 'third']);
    });

    it("rejects another parent's row", async function () {
      await knex(TAGS).insert([
        { id: 'a', post_id: 'post-1' },
        { id: 'x', post_id: 'post-2' },
      ]);

      await assert.rejects(tags.reorder(knex, { post_id: 'post-1' }, ['a', 'x']), {
        name: 'ValidationError',
      });
    });

    it("joins the caller's transaction", async function () {
      await assert.rejects(
        knex.transaction(async (trx) => {
          await views.reorder(trx, {}, ['third', 'second', 'first']);
          assert.deepEqual(await names(trx), ['third', 'second', 'first']);
          throw new Error('The caller failed');
        }),
        /The caller failed/,
      );

      assert.deepEqual(await names(), ['first', 'second', 'third']);
    });
  });

  // Each misuse is rejected when the code is compiled, and again when it runs, for callers the
  // compiler doesn't check.
  describe('scope', function () {
    it('rejects a scope for a collection that is the whole table', async function () {
      // @ts-expect-error This collection has no parent.
      assert.throws(() => views.inOrder(knex, { post_id: 'post-1' }), {
        name: 'IncorrectUsageError',
      });
    });

    it('rejects a missing or different scope for a collection scoped to a parent', async function () {
      // @ts-expect-error The parent is missing.
      assert.throws(() => tags.inOrder(knex, {}), { name: 'IncorrectUsageError' });
      // @ts-expect-error `tag_id` is not the parent column.
      await assert.rejects(tags.append(knex, { tag_id: 'a' }, 'a'), {
        name: 'IncorrectUsageError',
      });
      // @ts-expect-error `tag_id` is not part of the scope.
      await assert.rejects(tags.reorder(knex, { post_id: 'post-1', tag_id: 'a' }, []), {
        name: 'IncorrectUsageError',
      });
    });
  });

  describe('declared in the schema', function () {
    it("gives each of a table's collections by its position column", async function () {
      await knex(TAGS).insert([
        { id: 'a', post_id: 'post-1', sort_order: 1, pinned_order: 0 },
        { id: 'b', post_id: 'post-1', sort_order: 0, pinned_order: 1 },
      ]);
      const scope = { post_id: 'post-1' };

      assert.deepEqual(await collections(TAGS, 'sort_order').inOrder(knex, scope).pluck('id'), [
        'b',
        'a',
      ]);
      assert.deepEqual(await collections(TAGS, 'pinned_order').inOrder(knex, scope).pluck('id'), [
        'a',
        'b',
      ]);
    });

    it('rejects a column the table declares no collection on, when compiled and when run', function () {
      // @ts-expect-error The table declares no collection on `created_at`.
      assert.throws(() => collections(TAGS, 'created_at'), {
        name: 'IncorrectUsageError',
        message: `${TAGS} declares no sortable collection on created_at.`,
      });
    });

    it('rejects a table that declares no sortable collection, when compiled and when run', function () {
      // @ts-expect-error This table declares no sortable collection.
      assert.throws(() => collections(PLAIN, 'sort_order'), {
        name: 'IncorrectUsageError',
        message: `${PLAIN} declares no sortable collection on sort_order.`,
      });
      // The same holds for a table of Ghost's schema.
      // @ts-expect-error `posts` declares no sortable collection.
      assert.throws(() => sortable('posts', 'sort_order'), { name: 'IncorrectUsageError' });
    });

    type Declaring = TableDefinition & { '@@SORTABLE@@': SortableDefinition[] };
    const declared = (table: Declaring) => () =>
      sortableIn({ items: table })('items', 'sort_order');
    const columns = { id: idColumn, sort_order: position };
    const collection = { column: 'sort_order', tieBreak: [] };

    it.each([
      [
        'a position column that is not an integer',
        {
          ...columns,
          sort_order: { type: 'string', maxlength: 24, nullable: false },
          '@@SORTABLE@@': [collection],
        },
        'the position column sort_order must be an integer column',
      ],
      [
        'a table without an id column',
        { sort_order: position, '@@SORTABLE@@': [collection] },
        'the rows of a sortable collection are identified by an id column',
      ],
      [
        'a parent column the table does not have',
        { ...columns, '@@SORTABLE@@': [{ ...collection, within: 'post_id' }] },
        'post_id is not a column',
      ],
      [
        'a tie-break column the table does not have',
        { ...columns, '@@SORTABLE@@': [{ ...collection, tieBreak: ['created_at'] }] },
        'created_at is not a column',
      ],
      [
        'an index that contains the position column',
        { ...columns, '@@INDEXES@@': [['id', 'sort_order']], '@@SORTABLE@@': [collection] },
        'the position column sort_order must not be indexed',
      ],
      [
        'a unique constraint that contains the position column',
        {
          ...columns,
          '@@UNIQUE_CONSTRAINTS@@': [{ columns: ['id', 'sort_order'] }],
          '@@SORTABLE@@': [collection],
        },
        'the position column sort_order must not be indexed',
      ],
      [
        'a primary key that contains the position column',
        { ...columns, '@@PRIMARY_KEY@@': ['id', 'sort_order'], '@@SORTABLE@@': [collection] },
        'the position column sort_order must not be indexed',
      ],
      [
        'a position column with its own index',
        { ...columns, sort_order: { ...position, index: true }, '@@SORTABLE@@': [collection] },
        'the position column sort_order must not be indexed',
      ],
    ] satisfies [string, Declaring, string][])(
      'rejects a declaration with %s',
      function (_case, table, problem) {
        assert.throws(declared(table), {
          name: 'IncorrectUsageError',
          message: `items declares a sortable collection that can't be used: ${problem}.`,
        });
      },
    );
  });
});
