import type { Knex } from 'knex';
import type { DatabaseDate } from '../../lib/db-types/date';
import type { SortableInsert } from '../../lib/sortable';
import type { Segment } from './models';

/**
 * A segment as the table holds it. The table is a sortable collection, which reads and writes
 * each row's position, so the position isn't a column a query of the service can name.
 */
interface SegmentRow extends Segment {
  created_at: Date;
  updated_at: Date | null;
}

/** What an insert names. The collection adds the position. */
interface NewSegmentRow extends Segment {
  created_at: DatabaseDate;
}

/** A segment's name changes once it is stored and, in the POC, its filter. */
interface SegmentUpdate extends Pick<Segment, 'name' | 'filter'> {
  updated_at: DatabaseDate;
}

declare module 'knex/types/tables' {
  interface Tables {
    segments: Knex.CompositeTableType<SegmentRow, SortableInsert<NewSegmentRow>, SegmentUpdate>;
  }
}
