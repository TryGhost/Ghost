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

const BINDINGS_TABLE = 'members_custom_field_bindings';
const PRODUCTS_TABLE = 'products';

/** What a definition arrives with when a request asked for its dependencies. */
export interface DependencyRow {
    key: string;
    bound_port?: string | null;
    tier_id?: string | null;
    tier_name?: string | null;
}

/** The relations `?include=` serves, and nothing else is accepted. */
export const DEFINITION_RELATIONS = ['bindings', 'tiers'] as const;
export type DefinitionRelation = typeof DEFINITION_RELATIONS[number];

/**
 * Join what depends on a definition onto it.
 *
 * A join rather than a second read stitched on afterwards: what writes into a field and
 * what asks for it are each one foreign key away, and asking the database for them is what
 * a relation is. Both fan out, so a definition comes back once per dependency and is folded
 * back into one: a field may be written by several sources and asked for by several tiers,
 * and asking for both multiplies one by the other.
 *
 * It reads tables another part of the codebase writes, which is the point rather than a
 * leak: a definition and the things pointing at it are mutually aware by construction, and
 * the alternative is a registry standing between two halves of one question.
 */
export function withDependencies<T extends Knex.QueryBuilder>(query: T, relations: DefinitionRelation[]): T {
    const columns: string[] = [`${FIELDS_TABLE}.*`];

    if (relations.includes('bindings')) {
        query.leftJoin(BINDINGS_TABLE, `${BINDINGS_TABLE}.custom_field_key`, `${FIELDS_TABLE}.key`);
        columns.push(`${BINDINGS_TABLE}.port as bound_port`);
    }
    if (relations.includes('tiers')) {
        // Through the bindings, because that is where a destination is declared however it
        // was configured — a question and a collected address reach a field the same way.
        query
            .leftJoin({tier_binding: BINDINGS_TABLE}, `tier_binding.custom_field_key`, `${FIELDS_TABLE}.key`)
            .leftJoin(PRODUCTS_TABLE, `${PRODUCTS_TABLE}.id`, 'tier_binding.product_id');
        columns.push(`${PRODUCTS_TABLE}.id as tier_id`, `${PRODUCTS_TABLE}.name as tier_name`);
    }

    query.select(columns);
    return query;
}

/** Only what this build serves; a name it does not know is a relation a caller does not get. */
export function requestedRelations(withRelated: unknown): DefinitionRelation[] {
    const names = Array.isArray(withRelated) ? withRelated : [];
    return DEFINITION_RELATIONS.filter(relation => names.includes(relation));
}
