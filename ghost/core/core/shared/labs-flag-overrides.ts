/**
 * Shared in-memory store for remote feature-flag overrides.
 *
 * This module is the bridge between two concerns that should not depend on each
 * other: the remote-flags service (the writer) resolves a manifest for this site
 * and replaces the overrides, and the labs service (the reader) overlays them in
 * getAll(). Keeping the state in its own module means labs no longer has to expose
 * a write API that only remote-flags uses, and remote-flags never has to import
 * labs.
 *
 * It is Pro-only in practice: on self-hosted nothing ever writes to it, so it
 * stays empty and the labs overlay is a no-op.
 */

export type FlagOverrides = Record<string, boolean>;

// A flat `{flag: boolean}` map; empty when no manifest has been applied, which
// makes the labs overlay a no-op.
let overrides: FlagOverrides = {};

/**
 * Replace the active overrides. Called by the remote-flags service after it
 * resolves a manifest for this site. A non-object payload is treated as "none" so
 * a bad input can never throw or corrupt the store. The value is shallow-copied so
 * the caller cannot mutate live flag state by holding onto the passed object
 * (values are primitive booleans, so a shallow copy fully isolates).
 */
export function replace(next: unknown): void {
    overrides = (next && typeof next === 'object' && !Array.isArray(next))
        ? {...(next as FlagOverrides)}
        : {};
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
    return {...overrides};
}
