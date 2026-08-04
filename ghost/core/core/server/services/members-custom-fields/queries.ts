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
