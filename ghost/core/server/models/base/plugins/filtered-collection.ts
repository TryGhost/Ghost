import errors from '@tryghost/errors';
import { hasPosts } from '@tryghost/bookshelf-plugins';
import type { HasPostsConfig } from '@tryghost/bookshelf-plugins';
import type { Knex } from 'knex';
import { Filter } from '../../../lib/filters';
import type { FilterRelations, FilterStep } from '../../../lib/filters';
import { ResolvedFilter } from './resolved-filter';
import type { FilterOptions, FilterQueries, FilterTarget } from './resolved-filter';

// @types/bookshelf types `Model.extend` as returning `Function` and knows none of the methods
// Ghost's other model plugins add, so this plugin declares the part of Bookshelf it uses.

/**
 * A model as this plugin builds its filtered query: its table, the custom query and search steps
 * the custom query and search plugins add, the relations its filter keys name, and the
 * has-posts constraint a model such as Author declares.
 */
interface FilterableModel extends FilterTarget {
  readonly tableName: string;
  shouldHavePosts?: HasPostsConfig | null;
  query(): Knex.QueryBuilder;
  query(callback: (qb: Knex.QueryBuilder) => void): this;
  applyCustomQuery(options: Readonly<FilterOptions>): void;
  applySearchQuery(options: Readonly<FilterOptions>): void;
  /** How the relations the model's filter keys name join its table. None by default. */
  filterRelations(): FilterRelations | undefined;
  /** A filter every query of the model has, which overrides the caller's. None by default. */
  enforcedFilters(options: Readonly<FilterOptions>): unknown;
  /** A filter the model's queries have unless the caller's filter names its keys. None by default. */
  defaultFilters(options: Readonly<FilterOptions>): unknown;
  /** Filter text the filter plugin appends to the caller's. None by default. */
  extraFilters(options: Readonly<FilterOptions>): unknown;
}

/** Applies a resolved filter to a model's query. */
type ApplyFilter = (target: FilterableModel, options: Readonly<FilterOptions>) => void;

/** The filter plugin's apply: the filter in `options` and the model's default and enforced filters. */
type ApplyFilters = (this: FilterableModel, options: Readonly<FilterOptions>) => void;

/** A model class as this plugin uses it: the hook it adds, and `forge`, which makes a new model. */
interface FilterableModelClass {
  forge(): FilterableModel;
  rewriteFilteredQuery(query: Knex.QueryBuilder, options: Readonly<FilterOptions>): void;
}

/** The base model class every Ghost model extends, as far as this plugin uses it. */
interface BaseModel {
  readonly prototype: { readonly applyDefaultAndCustomFilters: ApplyFilters };
  extend(prototypeProperties: object, classProperties: object): BaseModel;
}

/** The Bookshelf instance as far as this plugin uses it: the base model it extends. */
interface FilterPluginBookshelf {
  Model: BaseModel;
}

/**
 * A new model of `Model`'s kind with its custom query, the filter, its default and enforced
 * filters and the search applied to its query, then the model's own rewrite of that query.
 * @param Model - the model class the filter was resolved for
 * @param options - the resolved options
 * @param applyFilter - applies the resolved filter to the new model's query
 */
function filteredCollection(
  Model: FilterableModelClass,
  options: Readonly<FilterOptions>,
  applyFilter: ApplyFilter,
): FilterableModel {
  const collection = Model.forge();

  // Apply model-specific query behavior
  collection.applyCustomQuery(options);

  // Add Filter behavior
  applyFilter(collection, options);

  // Apply model-specific search behavior
  collection.applySearchQuery(options);

  // Authors are hidden unless they have posts. Apply that constraint before
  // fetchPage clones its count query so pagination cannot reveal hidden staff.
  // Keep this author-specific: tags have separate, established count semantics.
  if (collection.shouldHavePosts?.joinTable === 'posts_authors') {
    collection.query(hasPosts.addHasPostsWhere(collection.tableName, collection.shouldHavePosts));
    collection.shouldHavePosts = null;
  }

  Model.rewriteFilteredQuery(collection.query(), options);

  return collection;
}

/** The queries of `Model` with a filter that `applyFilter` applies. */
function filterQueries(
  Model: FilterableModelClass,
  applyFilter: ApplyFilter,
): FilterQueries<FilterableModel> {
  return {
    collection: (options) => filteredCollection(Model, options, applyFilter),
    apply: applyFilter,
  };
}

/**
 * Throws when `model` or `options` ask for something the filter steps have no stage for: a
 * model's enforced, default or extra filters, or a query that asks for `useCTE`. The filter plugin
 * applies those, so ignoring them would query without a filter the model relies on.
 */
function rejectUnsupported(model: FilterableModel, options: Readonly<FilterOptions>): void {
  const unsupported = [
    model.enforcedFilters(options) ? 'enforcedFilters' : undefined,
    model.defaultFilters(options) ? 'defaultFilters' : undefined,
    model.extraFilters(options) ? 'extraFilters' : undefined,
    options.useCTE ? 'the useCTE option' : undefined,
  ].filter((name) => name !== undefined);
  if (unsupported.length > 0) {
    throw new errors.IncorrectUsageError({
      message: `The ${model.tableName} model's filter is resolved by steps, which don't support ${unsupported.join(', ')}.`,
      help: 'Express the filter as a filter step, or resolve this model through the filter plugin.',
    });
  }
}

/**
 * Resolves the filter in `options` for `Model` through `steps`: parses it once, runs each step on
 * it in order with `options` as the context, and returns the resolved filter, whose queries
 * compile the rewritten filter with the model's filter relations. A model whose filter is read
 * this way calls this from its resolveFilter, and its steps map the filter's keys onto the keys
 * its relations name. Throws when the model has enforced, default or extra filters, or the query
 * asks for `useCTE`, which the steps don't apply.
 */
export async function resolveFilterWithSteps(
  Model: FilterableModelClass,
  steps: readonly FilterStep[],
  options: FilterOptions,
): Promise<ResolvedFilter<FilterableModel>> {
  rejectUnsupported(Model.forge(), options);
  const filter = await Filter.resolve(options.filter, steps, options);
  return new ResolvedFilter(
    { ...options },
    filterQueries(Model, (target) => {
      // The filter plugin's own filterRelations() returns nothing for a model that names none
      const tables = { relations: target.filterRelations() ?? {} };
      target.query((qb) => filter.querySQL(qb, tables));
    }),
  );
}

export default function filteredCollectionPlugin(Bookshelf: FilterPluginBookshelf): void {
  // The filter plugin's apply, which builds a model's query from plain options. It stays in this
  // closure, where only a resolved filter's methods call it.
  const applyFilters = Bookshelf.Model.prototype.applyDefaultAndCustomFilters;

  Bookshelf.Model = Bookshelf.Model.extend(
    {
      /**
       * The filter plugin's apply took plain options, which skip the work a model's resolveFilter
       * does, so it throws. A filter is applied through the value resolveFilter returns.
       */
      applyDefaultAndCustomFilters() {
        throw new errors.IncorrectUsageError({
          message: 'A model applies only a filter its resolveFilter returned.',
          help: 'Await Model.resolveFilter(options), then call query(), collection() or applyTo(model) on the filter it returns.',
        });
      },
    },
    {
      /**
       * Rewrites, in place, the query a resolved filter built for this model, before the query
       * runs. It's called with the knex query builder and the resolved options, and a rewrite
       * must select the same rows. None by default.
       */
      rewriteFilteredQuery() {},

      /**
       * Resolves the filter in `options` and returns the resolved filter, whose query(),
       * collection() and applyTo() build this model's filtered queries. The filter plugin applies
       * it, with the model's default and enforced filters.
       */
      async resolveFilter(
        this: FilterableModelClass,
        options: FilterOptions,
      ): Promise<ResolvedFilter<FilterableModel>> {
        return new ResolvedFilter(
          { ...options },
          filterQueries(this, (target, resolved) => applyFilters.call(target, resolved)),
        );
      },
    },
  );
}
