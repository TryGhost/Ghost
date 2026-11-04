// @tryghost/mongo-knex ships no types, so this declares the surface Ghost's TypeScript uses.
// It types every `import` of the package in ghost; extend it when a caller needs more.
declare module '@tryghost/mongo-knex' {
  import type { Knex } from 'knex';

  /** Adds the WHERE clauses a Mongo-style query describes to `qb`, and returns it. */
  function knexify<T extends Knex.QueryBuilder>(
    qb: T,
    mongoQuery: object,
    config: { tableName: string },
  ): T;
  export = knexify;
}
