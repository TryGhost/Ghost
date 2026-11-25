import errors from '@tryghost/errors';
import { hasPosts } from '@tryghost/bookshelf-plugins';
import type { HasPostsConfig } from '@tryghost/bookshelf-plugins';
import type { Knex } from 'knex';
import { ResolvedFilter } from './resolved-filter';
import type { FilterOptions, FilterTarget } from './resolved-filter';

// @types/bookshelf types `Model.extend` as returning `Function` and knows none of the methods
// Ghost's other model plugins add, so this plugin declares the part of Bookshelf it uses.

/**
 * A model as this plugin builds its filtered query: its table, the custom query and search steps
 * the custom query and search plugins add, and the has-posts constraint a model such as Author
 * declares.
 */
interface FilterableModel extends FilterTarget {
  readonly tableName: string;
  shouldHavePosts?: HasPostsConfig | null;
  query(): Knex.QueryBuilder;
  query(callback: (qb: Knex.QueryBuilder) => void): this;
  applyCustomQuery(options: Readonly<FilterOptions>): void;
  applySearchQuery(options: Readonly<FilterOptions>): void;
}

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

export default function filteredCollectionPlugin(Bookshelf: FilterPluginBookshelf): void {
  // The filter plugin's apply, which builds a model's query from plain options. It stays in this
  // closure, where only a resolved filter's methods call it, with the options resolving returned.
  const applyFilters = Bookshelf.Model.prototype.applyDefaultAndCustomFilters;

  /**
   * A new model of `Model`'s kind with its custom query, the filter, its default and enforced
   * filters and the search applied to its query, then the model's own rewrite of that query.
   * @param Model - the model class the filter was resolved for
   * @param options - the resolved options
   */
  function filteredCollection(
    Model: FilterableModelClass,
    options: Readonly<FilterOptions>,
  ): FilterableModel {
    const collection = Model.forge();

    // Apply model-specific query behavior
    collection.applyCustomQuery(options);

    // Add Filter behavior
    applyFilters.call(collection, options);

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
          {
            collection: (resolved) => filteredCollection(this, resolved),
            apply: (target, resolved) => applyFilters.call(target, resolved),
          },
        );
      },
    },
  );
}
