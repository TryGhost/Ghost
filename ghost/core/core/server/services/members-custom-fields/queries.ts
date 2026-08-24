import type { Knex } from 'knex';
import { FIELD_STATUS, PUBLISHER_NAMESPACE } from './schema';

const FIELDS_TABLE = 'members_custom_fields';

// Archived fields must stay out of every read and write, and nothing in the database
// enforces that — no constraint stops a value row referencing an archived field. A query
// that forgets the filter is a silent bug, so the filter lives in one place.

/**
 * The fields the publisher declared, whatever their status.
 *
 * Here for the same reason the status filter is: a key is only unique inside its
 * namespace, so a query that forgets to name one can match a field Ghost declared, and
 * the definitions API would then offer it to be renamed or deleted. Every read and write
 * in that API goes through this, so no call site has to remember.
 */
export function publisherFields(db: Knex) {
  return db(FIELDS_TABLE).where('namespace', PUBLISHER_NAMESPACE);
}

/** Takes the executor so the same query runs standalone or inside a write's transaction. */
export function activeFields(db: Knex) {
  return publisherFields(db).where('status', FIELD_STATUS.active);
}

/**
 * Every active field, whichever namespace declared it.
 *
 * For the paths that address a field by namespace and key rather than by key alone: the
 * CSV columns and a member's values are about all of a member's data, not only the part
 * the publisher defined. The management API stays on `publisherFields`, because managing
 * is what ownership decides.
 */
export function activeFieldsInEveryNamespace(db: Knex) {
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
