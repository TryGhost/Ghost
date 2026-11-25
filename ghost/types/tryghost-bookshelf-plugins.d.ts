// @tryghost/bookshelf-plugins ships no types, so this declares the surface Ghost's TypeScript
// uses. It types every `import` of the package in ghost; extend it when a caller needs more.
declare module '@tryghost/bookshelf-plugins' {
  import type { Knex } from 'knex';

  /** The join table that links a model's rows to posts, and its column that holds the row's id. */
  export interface HasPostsConfig {
    joinTable: string;
    joinTo: string;
  }

  /** The has-posts plugin, which hides the rows of a model that no published post links to. */
  export const hasPosts: {
    /**
     * A query callback that keeps only the rows of `tableName` that `config`'s join table links
     * to a published post.
     */
    addHasPostsWhere(
      tableName: string,
      config: HasPostsConfig,
    ): (qb: Knex.QueryBuilder) => Knex.QueryBuilder;
  };
}
