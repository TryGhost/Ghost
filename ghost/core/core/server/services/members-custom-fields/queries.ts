import type { Knex } from 'knex';
import { FIELD_STATUS } from './schema';

const FIELDS_TABLE = 'members_custom_fields';

// Archived fields must stay out of every read and write, and nothing in the database
// enforces that — no constraint stops a value row referencing an archived field. A query
// that forgets the filter is a silent bug, so the filter lives in one place.

/** Takes the executor so the same query runs standalone or inside a write's transaction. */
export function activeFields(db: Knex) {
  return db(FIELDS_TABLE).where('status', FIELD_STATUS.active);
}

/**
 * The publisher's order, applied to every read of the list. Here for the same reason the
 * status filter is: a read that forgets it comes back in whatever order the engine chose.
 *
 * `created_at` orders a site that has never reordered, where every row still holds the
 * default rank; `id` settles the rest so the order is total.
 */
export function inFieldOrder<T extends Knex.QueryBuilder>(query: T): T {
  query
    .orderBy(`${FIELDS_TABLE}.sort_order`, 'asc')
    .orderBy(`${FIELDS_TABLE}.created_at`, 'asc')
    .orderBy(`${FIELDS_TABLE}.id`, 'asc');
  return query;
}
