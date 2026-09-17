/**
 * Shared in-memory store for remote feature-flag overrides: the remote-flags service
 * writes it (replace), the labs service reads it (getAll / get) in its overlay. Keeping it
 * separate means labs never exposes a write API and never imports the service. Empty
 * on self-hosted (nothing writes), so the labs overlay is a no-op there.
 */

export type FlagOverrides = Record<string, boolean>;

let overrides: FlagOverrides = {};

/**
 * Replace the active overrides. A non-object payload becomes "none". The value is
 * shallow-copied so the caller can't later mutate live flag state (values are
 * booleans, so a shallow copy fully isolates).
 */
export function replace(next: unknown): void {
  overrides =
    next && typeof next === 'object' && !Array.isArray(next) ? { ...(next as FlagOverrides) } : {};
}

/**
 * Drop all overrides, returning to purely local flag state.
 */
export function clear(): void {
  overrides = {};
}

/**
 * A read-only copy of the active overrides, for the labs overlay and for tests.
 */
export function getAll(): FlagOverrides {
  return { ...overrides };
}

/**
 * The override for one flag, or undefined when none is set. Copy-free, for the
 * labs single-flag lookup on the render hot path.
 */
export function get(flag: string): boolean | undefined {
  return Object.prototype.hasOwnProperty.call(overrides, flag) ? overrides[flag] : undefined;
}
