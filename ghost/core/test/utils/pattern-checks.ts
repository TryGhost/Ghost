import type { Knex } from 'knex';
import { groupBy, mapValues, sortBy } from 'lodash';
import type { PatternCheck } from '../../core/server/data/schema/lib/column-patterns';

type CheckRow = {
  TABLE_NAME: string;
  CONSTRAINT_NAME: string;
  CHECK_CLAUSE: string;
};

// How MySQL reports back the clause the schema builder writes for a pattern, such as
// regexp_like(`slug`,_utf8mb4\'^[a-z]+\\\\z\',_utf8mb4\'c\'). The pattern arrives escaped
// twice: once as a string literal in the clause, and again as the clause's own text.
const PATTERN_CLAUSE = /^regexp_like\(`([^`]+)`,_\w+\\'(.*)\\',_\w+\\'c\\'\)$/;
const unescape = (text: string) => text.replace(/\\(.)/g, '$1');

function checkFromClause(row: CheckRow): PatternCheck {
  const [, column, pattern] = PATTERN_CLAUSE.exec(row.CHECK_CLAUSE) ?? [];
  if (column === undefined || pattern === undefined) {
    return { constraintName: row.CONSTRAINT_NAME, column: '', pattern: row.CHECK_CLAUSE };
  }
  return { constraintName: row.CONSTRAINT_NAME, column, pattern: unescape(unescape(pattern)) };
}

/**
 * The check constraints on each table of the connected MySQL database, by table and sorted
 * by name, read back into the shape the schema builder makes of a column's `pattern`. A
 * check the builder did not make keeps its whole clause as its pattern, with no column, so
 * a comparison still shows it.
 */
export async function readPatternChecks(knex: Knex): Promise<Record<string, PatternCheck[]>> {
  const rows: CheckRow[] = await knex('information_schema.TABLE_CONSTRAINTS as t')
    .join('information_schema.CHECK_CONSTRAINTS as c', function () {
      this.on('t.CONSTRAINT_SCHEMA', 'c.CONSTRAINT_SCHEMA').andOn(
        't.CONSTRAINT_NAME',
        'c.CONSTRAINT_NAME',
      );
    })
    .where('t.TABLE_SCHEMA', knex.raw('DATABASE()'))
    .andWhere('t.CONSTRAINT_TYPE', 'CHECK')
    .select('t.TABLE_NAME', 'c.CONSTRAINT_NAME', 'c.CHECK_CLAUSE');

  return mapValues(groupBy(rows, 'TABLE_NAME'), (tableRows) =>
    sortBy(tableRows.map(checkFromClause), 'constraintName'),
  );
}
