import type { ColumnDefinition, IntegerColumn, TableDefinition } from '../types';

/**
 * A table's sortable collection: its rows, kept in an order. `server/lib/sortable.ts` reads the
 * collection in that order and writes the order.
 */
export interface SortableDefinition {
  /**
   * The integer column that holds each row's position. A lower position comes first.
   * `sortableBy` always declares `sort_order`. Readers take the column from the declaration
   * and don't assume its name.
   */
  column: string;
  /**
   * The column that scopes the order to a parent, such as `post_id` for a post's tags. Left out
   * when the whole table is one collection.
   */
  within?: string;
  /** The columns that order rows with the same position. The id always comes last. */
  tieBreak: readonly string[];
}

/** The column `sortableBy` gives a table for its rows' positions. */
const POSITION_COLUMN = 'sort_order';

/**
 * How the position column is defined, kept as literal types like the columns `schema.ts` writes
 * out, so a type derived from the schema reads this column as it reads any other.
 */
const POSITION = {
  type: 'integer',
  nullable: false,
  unsigned: true,
  defaultTo: 0,
} as const satisfies IntegerColumn;

/** What `sortableBy` adds to a table's definition: the position column and the declaration. */
interface SortableColumns<Order> {
  [POSITION_COLUMN]: typeof POSITION;
  '@@SORTABLE@@': Order & { column: typeof POSITION_COLUMN };
}

/**
 * Makes a table's rows a sortable collection. Spread the result into the table's definition,
 * where its position column belongs among the table's columns:
 *
 *     ...sortableBy({ tieBreak: ['created_at'] }),
 *
 * It gives the table the `sort_order` column, defined as every ordered table in Ghost defines
 * it, and the `@@SORTABLE@@` declaration that `sortable()` reads. The column names in `order`
 * are kept as literal types, so the compiler can check the scope `sortable()` is called with.
 */
export function sortableBy<const Order extends Omit<SortableDefinition, 'column'>>(
  order: Order,
): SortableColumns<Order> {
  return {
    [POSITION_COLUMN]: { ...POSITION },
    '@@SORTABLE@@': { ...order, column: POSITION_COLUMN },
  };
}

/** The column `name` of `table`, when the table has one. */
function columnOf(table: TableDefinition, name: string): ColumnDefinition | undefined {
  const entry = name.startsWith('@@') ? undefined : table[name];
  // Every entry that isn't a column is one of the `@@` options.
  return entry === undefined || Array.isArray(entry) || !('type' in entry) ? undefined : entry;
}

/**
 * What stops the sortable collection `table` declares from being used, as one message for each
 * problem. Empty when there is none, or when the table declares no collection.
 */
export function sortableDeclarationProblems(table: TableDefinition): string[] {
  const declared = table['@@SORTABLE@@'];
  if (!declared) {
    return [];
  }
  const { column, within, tieBreak } = declared;
  const indexed = [
    ...(table['@@INDEXES@@'] ?? []),
    ...(table['@@UNIQUE_CONSTRAINTS@@'] ?? []),
    table['@@PRIMARY_KEY@@'] ?? [],
  ].flatMap((index) =>
    typeof index === 'string' ? [index] : Array.isArray(index) ? index : index.columns,
  );

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
}
