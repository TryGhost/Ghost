import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import { defaultIndexName } from '../../../../../../core/server/data/schema/lib/default-index-name';

const TEST_CASES = [
  { title: 'a single column', table: 'tbl', columns: 'col' },
  { title: 'multiple columns', table: 'tbl', columns: ['col_a', 'col_b'] },
  { title: 'a dot in the table name', table: 'foo.bar', columns: 'col' },
  { title: 'a dash in the table name', table: 'foo-bar', columns: 'col' },
  { title: 'uppercase table and columns', table: 'FooBar', columns: ['ColA', 'ColB'] },
  { title: 'a mix of dots, dashes and uppercase', table: 'Foo.Bar-Baz', columns: ['ColA', 'ColB'] },
];

function knexIndexName(knex: Knex, table: string, columns: string | string[]): string {
  const sql = knex.schema
    .alterTable(table, (t) => {
      t.index(columns);
    })
    .toString();
  const result = sql.match(/index `([^`]+)`/)?.[1];
  assert(result, `Test setup error: could not extract index name from SQL: ${sql}`);
  return result;
}

describe('defaultIndexName', function () {
  const knex = createKnex({ client: 'mysql2' });

  afterAll(function () {
    return knex.destroy();
  });

  for (const { title, table, columns } of TEST_CASES) {
    it(`matches knex for ${title}`, function () {
      const actual = defaultIndexName(table, columns);
      const expected = knexIndexName(knex, table, columns);
      assert.equal(actual, expected);
    });
  }
});
