import { z } from 'zod';

/**
 * A table's columns as schema.js declares them, each read through `column`, without the `@@`
 * entries that describe the table rather than a column. Throws on a column `column` cannot
 * read, naming it.
 */
export function columnsOf<Column extends z.ZodType>(
  tableSpec: Record<string, unknown>,
  column: Column,
): Record<string, z.output<Column>> {
  return z
    .record(z.string(), column)
    .parse(
      Object.fromEntries(Object.entries(tableSpec).filter(([name]) => !name.startsWith('@@'))),
    );
}
