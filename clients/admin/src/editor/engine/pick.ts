/**
 * A shallow copy of `source` holding only `keys`, in the order they are given.
 * The copy is only as complete as `source`: a key it lacks lands as undefined.
 */
export function pick<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Pick<T, K> {
  const picked = {} as Pick<T, K>;
  for (const key of keys) {
    picked[key] = source[key];
  }
  return picked;
}
