import type { Knex } from 'knex';
import type { FilterTransformer } from '../../../lib/filters';

// A model's filter is resolved before it builds a query, because resolving can be asynchronous,
// such as reading records the filter names, and building a model's query is not.
// The model's resolveFilter returns a ResolvedFilter, whose methods are the only way to apply a
// filter to the model's queries. A caller that forgets to await resolveFilter holds a promise,
// which has none of the methods, so the mistake fails at the first call instead of building a
// query without the filter.

export type { FilterTransformer };

/** The query options a filter is resolved from. Models read other options besides these. */
export interface FilterOptions {
  filter?: string;
  /** The caller's rewrite of the parsed filter, such as the Admin API's check for restricted fields. */
  mongoTransformer?: FilterTransformer;
  transacting?: Knex.Transaction;
  /** Locks the rows the query selects, when it runs in a transaction. */
  forUpdate?: boolean;
  [option: string]: unknown;
}

/** A model of the kind a filter was resolved for, as far as the filter uses it: its query. */
export interface FilterTarget {
  query(): Knex.QueryBuilder;
}

/**
 * How the base model plugins build a model's queries from the options resolving returns, with
 * the resolved filter applied.
 */
export interface FilterQueries<Target extends FilterTarget> {
  /**
   * A new model whose query has the model's custom query, the filter, the model's default and
   * enforced filters and the search applied.
   */
  collection(options: Readonly<FilterOptions>): Target;
  /** Applies the filter and the model's default and enforced filters to `target`'s query. */
  apply(target: Target, options: Readonly<FilterOptions>): void;
}

/** A model's query options with their filter resolved, and the methods that build its queries. */
export class ResolvedFilter<Target extends FilterTarget> {
  /** A copy of the options the filter was resolved from. */
  readonly #options: Readonly<FilterOptions>;
  readonly #queries: FilterQueries<Target>;

  constructor(options: Readonly<FilterOptions>, queries: FilterQueries<Target>) {
    this.#options = options;
    this.#queries = queries;
  }

  /**
   * A new model of the kind the filter was resolved for, whose query has the filter applied, for
   * fetchPage and fetchAll. Its query doesn't join the options' transaction: fetchPage and
   * fetchAll take the transaction in their own options.
   */
  collection(): Target {
    return this.#queries.collection(this.#options);
  }

  /**
   * The query of collection(), for a caller that adds its own select. It runs in the options'
   * transaction when they have one, and then locks the rows it selects when they ask for
   * `forUpdate`.
   */
  query(): Knex.QueryBuilder {
    const query = this.collection().query();
    const { transacting, forUpdate } = this.#options;
    if (transacting) {
      query.transacting(transacting);
      if (forUpdate) {
        query.forUpdate();
      }
    }
    return query;
  }

  /**
   * Applies the filter to `target`, a model of the kind the filter was resolved for that already
   * has the attributes it is fetched by, such as its id.
   */
  applyTo(target: Target): void {
    this.#queries.apply(target, this.#options);
  }
}
