import type { NewRow, RowUpdate, SchemaTable, StoredRow } from '../../lib/db-types/tables';
import type { SortableInsert } from '../../lib/sortable';
import type { Segment } from './models';

/**
 * A segment as the table holds it. The table is a sortable collection, which reads and writes
 * each row's position, so the position isn't a column a query of the service can name.
 */
type SegmentRow = Omit<StoredRow<'segments'>, 'sort_order' | 'id'> & Pick<Segment, 'id'>;

/** What an insert names, which includes who added the segment. The collection adds the position. */
type NewSegmentRow = Omit<NewRow<'segments'>, 'sort_order' | 'id'> &
  Pick<Segment, 'id'> &
  Required<Pick<NewRow<'segments'>, 'created_by' | 'updated_by'>>;

/**
 * A segment's name and filter can change once it is stored, and an edit sets when it was edited
 * and by whom.
 */
type SegmentUpdate = Pick<RowUpdate<'segments'>, 'name' | 'filter'> &
  Required<Pick<RowUpdate<'segments'>, 'updated_at' | 'updated_by'>>;

declare module 'knex/types/tables' {
  interface Tables {
    segments: SchemaTable<
      'segments',
      { row: SegmentRow; insert: SortableInsert<NewSegmentRow>; update: SegmentUpdate }
    >;
  }
}
