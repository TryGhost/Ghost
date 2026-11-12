/**
 * Strips the legacy `published_by` field (a posts/pages column) from API
 * responses. This runs after every endpoint, so the walk avoids per-key tuple
 * allocations, array literals, and lodash calls in the hot path.
 */
export function removeXBY<T extends object>(object: T): T {
  const record = object as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    // CASE: go deeper
    const value = record[key];
    if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
      removeXBY(value);
    } else if (key === 'published_by') {
      delete record[key];
    }
  }

  return object;
}
