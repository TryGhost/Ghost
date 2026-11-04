import type { Knex } from 'knex';
import { groupBy, mapValues, sortBy } from 'lodash';
import type { TableCheck } from '../../core/server/data/schema/lib/table-checks';

type CheckRow = {
  TABLE_NAME: string;
  CONSTRAINT_NAME: string;
  CHECK_CLAUSE: string;
};

// How MySQL reports back the clause the schema builder writes for a pattern, such as
// regexp_like(`slug`,_utf8mb4\'(?-i)^[a-z]+\\\\z\'). The pattern arrives escaped twice: once
// as a string literal in the clause, and again as the clause's own text.
const PATTERN_CLAUSE = /^regexp_like\(`([^`]+)`,_\w+\\'(.*)\\'\)$/;
const unescape = (text: string) => text.replace(/\\(.)/g, '$1');

// How MySQL reports back an exactly-one check: the sum of each column being set, nested from the
// left, equal to one, such as
// ((((`value_text` is not null) + (`value_number` is not null)) + (`value_boolean` is not null)) = 1).
const SET_COLUMN = /`([^`]+)` is not null/g;
const exactlyOneClause = (columns: string[]) =>
  `(${columns
    .map((column) => `(\`${column}\` is not null)`)
    .reduce((sum, term) => `(${sum} + ${term})`)} = 1)`;

function checkFromClause(row: CheckRow): TableCheck {
  const [, column, pattern] = PATTERN_CLAUSE.exec(row.CHECK_CLAUSE) ?? [];
  if (column !== undefined && pattern !== undefined) {
    return {
      kind: 'pattern',
      constraintName: row.CONSTRAINT_NAME,
      column,
      pattern: unescape(unescape(pattern)),
    };
  }
  const columns = [...row.CHECK_CLAUSE.matchAll(SET_COLUMN)].map(([, name]) => name);
  if (columns.length > 1 && row.CHECK_CLAUSE === exactlyOneClause(columns)) {
    return { kind: 'exactly-one', constraintName: row.CONSTRAINT_NAME, columns };
  }
  return {
    kind: 'pattern',
    constraintName: row.CONSTRAINT_NAME,
    column: '',
    pattern: row.CHECK_CLAUSE,
  };
}

/**
 * The check constraints on each table of the connected MySQL database, by table and sorted
 * by name, read back into the shape the schema builder makes of them. A check the builder
 * did not make keeps its whole clause as its pattern, with no column, so a comparison still
 * shows it.
 */
export async function readTableChecks(knex: Knex): Promise<Record<string, TableCheck[]>> {
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
