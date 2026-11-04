import errors from '@tryghost/errors';
import { z } from 'zod';
import { columnsOf } from './columns';
import { patternChecksOf, type PatternCheck } from './column-patterns';

/**
 * A check that exactly one of a group of columns holds a value in every row, declared on the
 * table as `'@@CHECKS@@': [{ exactlyOneOf: [...] }]`. For a table that keeps each value in the
 * column of its kind, so a row can't hold its value in two columns, or in none.
 */
export type ExactlyOneCheck = {
  kind: 'exactly-one';
  constraintName: string;
  columns: string[];
};

/**
 * The check that exactly one of `columns` is set, as `tableChecksOf` makes it from a table's
 * declaration. A migration builds it from the columns it names rather than from schema.js, so it
 * keeps adding what it added when schema.js later changes.
 */
export function exactlyOneCheck(tableName: string, columns: string[]): ExactlyOneCheck {
  return { kind: 'exactly-one', constraintName: `${tableName}_exactly_one_check`, columns };
}

/** A check constraint a table declares, on one of its columns or on the table. */
export type TableCheck = PatternCheck | ExactlyOneCheck;

const DeclaredChecks = z
  .array(z.object({ exactlyOneOf: z.array(z.string()).min(2) }).strict())
  .default([]);

const Nullability = z.object({ nullable: z.boolean().optional() });

/**
 * Every check constraint a table declared in schema.js holds on MySQL: each column's pattern,
 * then each check declared on the table. Throws on a pattern MySQL would read differently, and on
 * an exactly-one check naming a column the table doesn't have or one that can't be null, which
 * would hold more than it says.
 */
export function tableChecksOf(tableName: string, tableSpec: Record<string, unknown>): TableCheck[] {
  const columns = columnsOf(tableSpec, Nullability);
  const exactlyOne = DeclaredChecks.parse(tableSpec['@@CHECKS@@']).map(
    ({ exactlyOneOf }): ExactlyOneCheck => {
      for (const column of exactlyOneOf) {
        if (columns[column]?.nullable !== true) {
          throw new errors.IncorrectUsageError({
            message: `${tableName}: exactly one of ${exactlyOneOf.join(', ')} can be set only if each is a nullable column of the table, and ${column} isn't.`,
          });
        }
      }
      return exactlyOneCheck(tableName, exactlyOneOf);
    },
  );
  return [...patternChecksOf(tableName, tableSpec), ...exactlyOne];
}

/**
 * A check's condition as knex's `raw` takes it, with `??` for each identifier and `?` for each
 * value, so the statement that adds it names and escapes them. A count of the columns set, for
 * an exactly-one check, so a group can grow without the condition changing shape.
 */
export function conditionOf(check: TableCheck): { sql: string; bindings: string[] } {
  switch (check.kind) {
    case 'pattern':
      return { sql: '?? REGEXP ?', bindings: [check.column, check.pattern] };
    case 'exactly-one':
      return {
        sql: `${check.columns.map(() => '(?? IS NOT NULL)').join(' + ')} = 1`,
        bindings: check.columns,
      };
  }
}
