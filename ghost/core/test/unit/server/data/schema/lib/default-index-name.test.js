const assert = require('node:assert/strict');
const Knex = require('knex');
const {defaultIndexName} = require('../../../../../../core/server/data/schema/lib/default-index-name');

const TEST_CASES = [
    {title: 'a single column', table: 'tbl', columns: 'col'},
    {title: 'multiple columns', table: 'tbl', columns: ['col_a', 'col_b']},
    {title: 'a dot in the table name', table: 'foo.bar', columns: 'col'},
    {title: 'a dash in the table name', table: 'foo-bar', columns: 'col'},
    {title: 'uppercase table and columns', table: 'FooBar', columns: ['ColA', 'ColB']},
    {title: 'a mix of dots, dashes and uppercase', table: 'Foo.Bar-Baz', columns: ['ColA', 'ColB']}
];

/**
 * @param {import('knex').Knex} knex
 * @param {string} table
 * @param {string|string[]} columns
 * @returns {string}
 */
function knexIndexName(knex, table, columns) {
    const [{sql}] = knex.schema.table(table, function (t) {
        t.index(columns);
    }).toSQL();
    return sql.match(/index `([^`]+)`/)[1];
}

describe('defaultIndexName', function () {
    for (const client of ['better-sqlite3', 'mysql2']) {
        describe(client, function () {
            const knex = Knex({client, useNullAsDefault: true});

            afterAll(function () {
                return knex.destroy();
            });

            for (const {title, table, columns} of TEST_CASES) {
                it(`matches knex for ${title}`, function () {
                    const actual = defaultIndexName(table, columns);
                    const expected = knexIndexName(knex, table, columns);
                    assert.equal(actual, expected);
                });
            }
        });
    }
});
