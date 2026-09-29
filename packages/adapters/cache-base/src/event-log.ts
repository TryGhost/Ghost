// Optional support for expiring event logs. Append, trim and expiry must be atomic
// so concurrent writes cannot overwrite each other.
export interface EventLogCache {
  /**
   * Add a unique value at a Unix timestamp in milliseconds. Remove events at or
   * before timestamp - ttl * 1000, keep the newest limit entries, and expire the log
   * after ttl seconds. Return the number of entries left. Failures must reject
   * or throw so callers can distinguish an outage from an empty log.
   */
  appendEvent(
    key: string,
    value: string,
    timestamp: number,
    ttl: number,
    limit: number,
  ): Promise<number> | number;
  /** Read values at or after since (Unix milliseconds), oldest first. */
  readEvents(key: string, since: number): Promise<string[]> | string[];
  /** Optional batch read. Return one event array per key, in the same order. */
  readEventsMany?(keys: string[], since: number): Promise<string[][]> | string[][];
}

export function supportsEventLog(cache: unknown): cache is EventLogCache {
  return (
    typeof cache === 'object' &&
    cache !== null &&
    'appendEvent' in cache &&
    typeof cache.appendEvent === 'function' &&
    'readEvents' in cache &&
    typeof cache.readEvents === 'function'
  );
}
