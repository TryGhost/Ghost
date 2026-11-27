/**
 * The expressions a column can default to, by the name its `defaultExpression` gives, each for
 * a column of the given precision. Each is written as MySQL reports it back in
 * `information_schema.COLUMNS`, so the check that compares a migrated database with schema.ts
 * compares the two as text.
 */
const EXPRESSIONS = {
  /**
   * The time the row is written, in UTC whatever the connection's time zone. MySQL reports it
   * without a precision when there are no fractional seconds.
   */
  now: (precision?: number) => `utc_timestamp(${precision || ''})`,
} as const;

/** The name of an expression a column can default to. */
export type DefaultExpression = keyof typeof EXPRESSIONS;

/**
 * A column's `defaultExpression`, as schema.ts declares it, for the expressions in `Names`. A
 * column declares a `defaultTo` value or a `defaultExpression`, not both.
 */
export type DefaultExpressionColumn<Names extends DefaultExpression> =
  | { defaultExpression?: never }
  | {
      defaultTo?: never;
      /**
       * What the database fills the column with when an insert leaves it out, evaluated as the
       * row is written, where `defaultTo` gives a value that is the same for every row. Held
       * only on MySQL, like a column's `pattern`: on SQLite, which is being removed, the column
       * has no default, so a writer that runs there still gives the value.
       */
      defaultExpression?: Names;
    };

/**
 * The SQL expression `name` stands for in a column with `precision` digits of fractional
 * seconds, as MySQL reports it back.
 */
export function defaultExpressionSql(name: DefaultExpression, precision?: number): string {
  return EXPRESSIONS[name](precision);
}
