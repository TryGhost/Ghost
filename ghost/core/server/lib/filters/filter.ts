import type { Knex } from 'knex';
import { type ParsedFilter, parseFilter } from './parse';
import { type FilterTables, querySQL } from './sql';
import type { FilterContext, FilterStep } from './steps';

/**
 * A filter read from its text and rewritten by each of its steps, ready to build a query from.
 * The text is parsed once, here, and the steps run once, in order, so the filter can build any
 * number of queries without reading anything again.
 */
export class Filter {
  /** The filter after its steps, or undefined when there's no filter and every row matches. */
  readonly #parsed: ParsedFilter | undefined;

  private constructor(parsed: ParsedFilter | undefined) {
    this.#parsed = parsed;
  }

  /**
   * Parses `text` and passes the parsed filter through each of `steps` in turn, each one
   * receiving the filter the one before it returned. Empty or missing text is no filter, and no
   * step runs. Throws `unreadableFilter` when the text doesn't parse, and whatever a step throws
   * to reject the filter.
   */
  static async resolve(
    text: string | undefined,
    steps: readonly FilterStep[],
    context: FilterContext,
  ): Promise<Filter> {
    if (!text) {
      return new Filter(undefined);
    }
    let parsed = parseFilter(text);
    for (const step of steps) {
      parsed = await step(parsed, context);
    }
    return new Filter(parsed);
  }

  /**
   * Adds the filter's conditions to `qb`'s WHERE clause; see `querySQL`. Adds nothing when there's
   * no filter.
   */
  querySQL(qb: Knex.QueryBuilder, tables: FilterTables): void {
    if (this.#parsed !== undefined) {
      querySQL(qb, this.#parsed, tables);
    }
  }
}
