import chunk from 'lodash/chunk';
import nql from '@tryghost/nql';
import type {Knex} from 'knex';

export const CHUNK_SIZE = 100;

export type WhereStrategy = Iterable<(qb: Knex.QueryBuilder) => void>;

/**
 * Creates a where strategy that applies an NQL filter to the query builder.
 * Yields a single query modifier — no chunking.
 */
export function* byNQL(filter: string): WhereStrategy {
    yield (qb) => {
        nql(filter).querySQL(qb);
    };
}

/**
 * Creates a where strategy that applies whereIn for the given column and values.
 * Automatically chunks values to avoid SQL parameter limits.
 */
export function* byColumnValues(column: string, values: string[], chunkSize: number = CHUNK_SIZE): WhereStrategy {
    for (const c of chunk(values, chunkSize)) {
        yield qb => qb.whereIn(column, c);
    }
}

/**
 * Creates a where strategy for matching by id column.
 * Convenience wrapper around byColumnValues.
 */
export function* byIds(ids: string[], chunkSize: number = CHUNK_SIZE): WhereStrategy {
    yield* byColumnValues('id', ids, chunkSize);
}
