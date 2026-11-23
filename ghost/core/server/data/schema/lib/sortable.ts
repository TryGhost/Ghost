import type { ColumnDefinition, TableDefinition } from '../types';

/**
 * A sortable collection: rows of the table that are kept in an order. `server/lib/sortable.ts`
 * reads the collection in that order and writes the order.
 */
export interface SortableDefinition {
  /** The integer column that holds each row's position. A lower position comes first. */
  column: string;
  /**
   * The column that scopes the order to a parent, such as `post_id` for a post's tags. Left out
   * when the whole table is one collection.
   */
  within?: string;
  /** The columns that order rows with the same position. The id always comes last. */
  tieBreak: readonly string[];
}

/**
 * Declares a sortable collection in a table's `@@SORTABLE@@`. The declaration is returned as it
 * is given, with its column names kept as literal types, so that the compiler can check the
 * column and the scope `sortable()` is called with.
 */
export function sortableBy<const Definition extends SortableDefinition>(
  definition: Definition,
): Definition {
  return definition;
}

/** The column `name` of `table`, when the table has one. */
function columnOf(table: TableDefinition, name: string): ColumnDefinition | undefined {
  const entry = name.startsWith('@@') ? undefined : table[name];
  // Every entry that isn't a column is one of the `@@` lists.
  return entry === undefined || Array.isArray(entry) ? undefined : entry;
}

/**
 * What stops the sortable collections `table` declares from being used, as one message for
 * each problem. Empty when there is none.
 */
export function sortableDeclarationProblems(table: TableDefinition): string[] {
  const indexed = [
    ...(table['@@INDEXES@@'] ?? []),
    ...(table['@@UNIQUE_CONSTRAINTS@@'] ?? []),
    table['@@PRIMARY_KEY@@'] ?? [],
  ].flatMap((index) =>
    typeof index === 'string' ? [index] : Array.isArray(index) ? index : index.columns,
  );

  return (table['@@SORTABLE@@'] ?? []).flatMap(({ column, within, tieBreak }) => {
    const problems: string[] = [];
    const position = columnOf(table, column);
    if (position?.type !== 'integer') {
      problems.push(`the position column ${column} must be an integer column`);
    }
    if (!columnOf(table, 'id')) {
      problems.push('the rows of a sortable collection are identified by an id column');
    }
    for (const other of [...(within === undefined ? [] : [within]), ...tieBreak]) {
      if (!columnOf(table, other)) {
        problems.push(`${other} is not a column`);
      }
    }
    // A reorder locks rows in id order so that two reorders can't deadlock. MySQL would read
    // through an index that contains the position column, and lock in position order. A unique
    // index or a primary key would also fail a reorder partway, as positions pass through
    // values other rows still hold.
    if (indexed.includes(column) || position?.index || position?.unique || position?.primary) {
      problems.push(`the position column ${column} must not be indexed`);
    }
    return problems;
  });
}
