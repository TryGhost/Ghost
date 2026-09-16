import type { Knex as KnexConnection } from 'knex';

/** The only billing interval a periodic limit understands. */
export type Interval = 'month';

/**
 * The table operations used to start a count query. Reuse Knex's signatures so real
 * connections and transactions satisfy this interface. The import is erased at runtime.
 */
export interface QueryBuilder {
  select: KnexConnection.QueryBuilder['select'];
  count(column: string, options: { as: string }): CountQueryBuilder;
  sum(column: string, options: { as: string }): CountQueryBuilder;
}

/** Aggregate queries retain the legacy allowance for an absent period binding. */
interface CountQueryBuilder {
  where(column: string, operator: string, value: unknown): CountQueryBuilder;
  first(): PromiseLike<CountRow>;
}

/** Counts retain database strings, empty aggregates, and the upload no-op. */
export type Count = number | string | null | undefined;

/** A row carrying an aggregate. Some drivers hand these back as strings. */
export interface CountRow {
  count?: Count;
}

/** Builds a query against a named table. */
export type Knex = (table: string) => QueryBuilder;

/** A knex instance, or a transaction standing in for one. */
export type Db = { knex?: Knex };

/**
 * Counts what a limit is measured against. Supplied by whoever configures the limit, so the
 * package never learns what is being counted or where the number comes from.
 */
export type CurrentCountQuery = (
  knex: Knex,
  periodStart?: string,
) => Promise<Count> | Count;

/** Renders a count for a message, where the plain number is not what a reader wants. */
export type Formatter = (count: Count) => string;

/** One limit as its host configured it, merged with what the product declares about it. */
export interface LimitConfig {
  max?: number;
  maxPeriodic?: number;
  disabled?: boolean;
  allowlist?: string[];
  error?: string;
  currentCountQuery?: CurrentCountQuery;
  formatter?: Formatter;
  interval?: Interval;
  startDate?: string;
}

/**
 * What a caller may pass when asking whether something is allowed. Callers hand this
 * straight through as metadata and the limits read only the keys they know, so anything
 * else a caller carries alongside is passed along untouched rather than rejected.
 */
export interface CheckOptions {
  [key: string]: unknown;
  max?: number;
  addedCount?: number;
  currentCount?: number;
  transacting?: Knex;
  value?: string;
}

/** The payload handed to the caller's error constructor. */
export interface GhostErrorOptions {
  message?: string;
  help?: string;
  errorDetails: { name: string; limit?: number; total?: Count };
}

/**
 * The caller's error module, so refusals are raised as the errors the caller recognises.
 * The two are constructed with different payloads and are typed for what they actually
 * receive, rather than for the union of both.
 */
export interface ErrorsModule {
  HostLimitError: new (options: GhostErrorOptions) => Error;
  IncorrectUsageError: new (options: { message: string }) => Error;
}

/** The billing period a periodic limit counts within. */
export interface Subscription {
  interval: Interval;
  startDate: string;
}

/** Everything the service needs to build a site's limits. */
export interface LoadLimitsOptions {
  limits?: Record<string, LimitConfig>;
  subscription?: Subscription;
  helpLink?: string;
  db?: Db;
  errors: ErrorsModule;
}
