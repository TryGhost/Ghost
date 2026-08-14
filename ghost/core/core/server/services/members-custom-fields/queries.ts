import type {Knex} from 'knex';
import {FIELD_STATUS} from './schema';

const FIELDS_TABLE = 'members_custom_fields';

// Shared query builders over the field definitions, used by both the definitions
// service and the values service.
//
// The `status = 'active'` filter is the one invariant worth centralising: archived
// fields must stay out of every read and every write, and that's enforced by a
// filter, not a database constraint — nothing stops a value row referencing an
// archived field, so a query that forgets the filter is a silent bug. Keeping the
// filter in one builder means there's one place to get it right.

/**
 * The active field definitions. Takes the executor — a knex instance or a
 * transaction — so the same query runs standalone or inside a write's
 * transaction; callers chain their own `select`/`orderBy`/`whereIn` onto it.
 */
export function activeFields(db: Knex) {
    return db(FIELDS_TABLE).where('status', FIELD_STATUS.active);
}
