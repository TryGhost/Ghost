/**
 * Canonical type definitions for the custom redirects service.
 *
 * These types are the lingua franca between the API endpoint, the
 * `RedirectsService`, and any concrete store implementation. The store
 * never sees raw file content or wire formats — only `RedirectConfig[]`.
 *
 * @typedef {Object} RedirectConfig
 * @property {string} from - The relative incoming URL or RegExp pattern source
 * @property {string} to - The redirect target. May be relative or absolute. Capture groups from `from` can be referenced as `$1`, `$2`, etc.
 * @property {boolean} [permanent] - `true` for HTTP 301 (permanent), `false` or omitted for HTTP 302 (temporary)
 */

/**
 * The storage interface that every redirects store implementation must
 * satisfy. Domain-typed: callers pass and receive `RedirectConfig[]`.
 * Serialization, file paths, network calls, etc. are internal to the
 * implementation.
 *
 * Backups are an implementation-specific concern — the contract makes
 * no statement about whether previous state is retained.
 *
 * Concurrent `replaceAll` calls have no ordering guarantee; callers must
 * serialize writes externally if that matters.
 *
 * @typedef {Object} RedirectsStore
 * @property {() => Promise<RedirectConfig[]>} getAll - Returns the currently stored redirects, or `[]` if none.
 * @property {(redirects: RedirectConfig[]) => Promise<void>} replaceAll - Replaces all stored redirects with the given array. Calling with `[]` clears all redirects.
 */

module.exports = {};
