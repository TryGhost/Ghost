import type { Promisable } from 'type-fest';

/**
 * Data storage abstraction for automations.
 *
 * Implementations of this interface should have limited logic. Each should
 * roughly correspond to one database query. Logic should live in callers.
 *
 * NOTE: `AutomationsRepository2` will soon subsume `AutomationsRepository`. See NY-1704.
 */
export type AutomationsRepository2<Connection> = {
  /** Get the count of all automations. */
  getNumberOfAutomations: (connection: Connection) => Promisable<number>;

  /** Run a function within a repository connection. */
  withConnection: <ReturnT>(fn: (connection: Connection) => ReturnT) => ReturnT;
};
