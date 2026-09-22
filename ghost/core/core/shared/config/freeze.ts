/**
 * Recursively freeze a plain-data tree in place.
 *
 * Only safe on a structure nothing else holds a reference to - the config
 * snapshot is deep cloned before this runs, so freezing it cannot reach into
 * nconf's own stores.
 */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }

  return value;
}
