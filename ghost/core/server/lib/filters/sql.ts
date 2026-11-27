import knexify from '@tryghost/mongo-knex';
import { mergeFilters } from '@tryghost/mongo-utils';
import type { Knex } from 'knex';
import { combineNeFilters, expandAllFilters } from './nql-utils';
import { type ParsedFilter, unreadableFilter } from './parse';

/**
 * How each relation a filter can name joins the queried table, by the relation's name, in the
 * shape `@tryghost/mongo-knex` reads: a model's `filterRelations()`.
 */
export type FilterRelations = Readonly<Record<string, object>>;

/** How a filter's keys map onto the tables of the query it is compiled onto. */
export interface FilterTables {
  /** How relation keys, such as `labels.slug`, join the queried table. */
  readonly relations: FilterRelations;
}

/** Expands the `$all` of every key. */
const everyKey = () => true;

/**
 * `filter` in the form SQL is compiled from, in the order `@tryghost/nql` prepares a filter: empty
 * groups are dropped, several `$ne` statements on one key in an `$and` become one `$nin`, and
 * `$all` becomes an `$and` of equality statements, one per value. `filter` itself is left as it
 * is, because combining `$ne` statements changes a filter in place.
 */
function forSql(filter: ParsedFilter): ParsedFilter {
  return expandAllFilters(combineNeFilters(mergeFilters(structuredClone(filter))), everyKey);
}

/**
 * Adds `filter`'s conditions to `qb`'s WHERE clause, with its relation keys joined onto `qb`'s
 * tables by `tables`. Throws `unreadableFilter` when the filter uses an operator or key that can't
 * be compiled.
 */
export function querySQL(qb: Knex.QueryBuilder, filter: ParsedFilter, tables: FilterTables): void {
  try {
    knexify(qb, forSql(filter), { relations: tables.relations });
  } catch (err) {
    throw unreadableFilter(err);
  }
}
