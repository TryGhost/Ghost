import type { Knex } from 'knex';

/** Preserve the provider's opaque ID even on MySQL's case-insensitive tables. */
export function whereProviderMessageId(query: Knex.QueryBuilder, column: string, id: string): void {
  // Keep an ordinary equality predicate so MySQL can use the prefix index.
  query.where(column, id);
  if (query.client.config.client === 'mysql2') {
    query.whereRaw('BINARY ?? = BINARY ?', [column, id]);
  }
}
