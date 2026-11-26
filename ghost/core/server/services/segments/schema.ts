import type { NewRow, RowUpdate, SchemaTable, StoredRow } from '../../lib/db-types/tables';
import type { SortableInsert } from '../../lib/sortable';
import type { Segment } from './models';

/**
 * A segment as the table holds it. The table is a sortable collection, which reads and writes
 * each row's position, so the position isn't a column a query of the service can name.
 */
type SegmentRow = Omit<StoredRow<'segments'>, 'sort_order' | 'id'> & Pick<Segment, 'id'>;

/** What an insert names. The collection adds the position. */
type NewSegmentRow = Omit<NewRow<'segments'>, 'sort_order' | 'id'> & Pick<Segment, 'id'>;

/** Only a segment's name changes once it is stored. */
type SegmentUpdate = Required<Pick<RowUpdate<'segments'>, 'name' | 'updated_at'>>;

declare module 'knex/types/tables' {
  interface Tables {
    segments: SchemaTable<
      'segments',
      { row: SegmentRow; insert: SortableInsert<NewSegmentRow>; update: SegmentUpdate }
    >;
  }
}
