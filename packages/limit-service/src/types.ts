/**
 * The error classes a caller hands in, so a thrown limit error is an instance of the
 * caller's own error module and its `instanceof` checks keep working.
 */
export interface ErrorsModule {
  HostLimitError: new (options: GhostErrorOptions) => Error;
  IncorrectUsageError: new (options: GhostErrorOptions) => Error;
}

export type GhostErrorOptions = Record<string, unknown> & { message?: string };

/** What kind of thing a limit constrains. Declared, never guessed from the config's shape. */
export type LimitKind = 'flag' | 'max' | 'maxPeriodic' | 'allowlist';

/**
 * Counts the resource a limit is measured against. Supplied by whoever is composing the
 * service, because only they know how to count: a query on the server, a request in a
 * browser. The limit service never learns what it is counting.
 */
export type Counter = (options: CountOptions) => Promise<number> | number;

export interface CountOptions {
  /** An open transaction to count within, where the composer supports one. */
  transacting?: unknown;
  /** Start of the current period, for a limit that resets. */
  periodStart?: string;
}

/** Renders a count for display in an error message. */
export type Formatter = (count: number) => string;

export type Interval = 'month';

/** One limit as its host configured it. Values only: no functions, because this is JSON. */
export interface LimitConfig {
  max?: number;
  maxPeriodic?: number;
  allowlist?: string[];
  disabled?: boolean;
  error?: string;
}

/** The billing period a periodic limit counts within. */
export interface Subscription {
  startDate?: string;
  interval?: Interval;
}

/** Options a check accepts, each overriding what the limit was built with. */
export interface CheckOptions {
  max?: number;
  addedCount?: number;
  currentCount?: number;
  transacting?: unknown;
  value?: string;
}

/** What a caller is told when a limit cannot be built, rather than it vanishing silently. */
export interface LimitProblem {
  limit: string;
  reason: string;
}
