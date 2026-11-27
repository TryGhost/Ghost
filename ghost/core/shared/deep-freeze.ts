import type { ReadonlyDeep } from 'type-fest';

/**
 * Recursively freeze a plain-data tree in place. Only safe on a structure
 * nothing else holds a reference to, and an already-frozen subtree is left
 * alone, children included.
 */
export function deepFreeze<T>(value: T): ReadonlyDeep<T> {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value as ReadonlyDeep<T>;
  }

  Object.freeze(value);

  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }

  return value as ReadonlyDeep<T>;
}
