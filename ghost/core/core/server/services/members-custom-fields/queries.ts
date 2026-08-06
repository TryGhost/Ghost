import type {Knex} from 'knex';
import {FIELD_STATUS} from './schema';

const FIELDS_TABLE = 'members_custom_fields';

// Archived fields must stay out of every read and write, and nothing in the database
// enforces that — no constraint stops a value row referencing an archived field. A query
// that forgets the filter is a silent bug, so the filter lives in one place.

/** Takes the executor so the same query runs standalone or inside a write's transaction. */
export function activeFields(db: Knex) {
    return db(FIELDS_TABLE).where('status', FIELD_STATUS.active);
}

/**
 * The publisher's order, applied to any query over the definitions table.
 *
 * Here for the same reason the status filter is: a read that forgets it comes back in
 * whatever order the engine felt like, which is a bug nothing fails on. Order belongs
 * to the list rather than to any field, so every read of the list goes through this
 * and no caller ever names a column.
 *
 * `sort_order` is rewritten across every row on a reorder, so on its own it decides the
 * order once a publisher has set one. Only ranks written by the same reorder are
 * guaranteed distinct — a create appends past the highest, and a delete leaves a gap, so
 * the sequence is not dense and nothing should assume it is. Only the relative order
 * means anything.
 *
 * `created_at` is what actually orders a site that has never reordered, where every row
 * still holds the default 0 and there is nothing else to tell them apart. `id` is the
 * final tiebreaker for two fields created in the same millisecond, so the order is total
 * and a list never shuffles between two identical requests.
 */
export function inFieldOrder<T extends Knex.QueryBuilder>(query: T): T {
    // Columns are qualified so this survives being applied to a join. Every table a
    // definition would be joined to has an `id` and a `created_at` of its own, and a bare
    // column name would be ambiguous against any of them.
    query
        .orderBy(`${FIELDS_TABLE}.sort_order`, 'asc')
        .orderBy(`${FIELDS_TABLE}.created_at`, 'asc')
        .orderBy(`${FIELDS_TABLE}.id`, 'asc');
    return query;
}
