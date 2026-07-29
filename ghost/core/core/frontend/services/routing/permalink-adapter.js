/**
 * @description Permalink Adapter — the anti-corruption layer between the routing
 * domain model and the Express / URL-service infrastructure.
 *
 * The domain model expresses permalinks in `{slug}` notation (the publisher's
 * language, as written in `routes.yaml`). Express route mounting, `path-match`
 * and the URL service's `replacePermalink` all require `:slug` notation. This
 * module is the single, named boundary where that translation happens — routers
 * call it when mounting routes and registering with the URL service, so the
 * conversion lives in exactly one place instead of scattered regex replacements.
 *
 * Both conversions are idempotent: passing an already-converted permalink back
 * through returns it unchanged.
 */

/**
 * Convert a domain-model permalink into Express / URL-service notation.
 *
 * @example toExpressNotation('/{slug}/')              // => '/:slug/'
 * @example toExpressNotation('/{primary_tag}/{slug}/') // => '/:primary_tag/:slug/'
 * @example toExpressNotation('/:slug/')               // => '/:slug/' (idempotent)
 *
 * @param {string} permalink permalink in `{slug}` (domain) notation
 * @returns {string} permalink in `:slug` (infrastructure) notation
 */
function toExpressNotation(permalink) {
    return permalink.replace(/{(\w+)}/g, ':$1');
}

/**
 * Convert an Express / URL-service permalink back into domain-model notation.
 * Will be used on the download path when serialising the canonical shape back
 * to YAML (wired up in HKG-1897) — no production caller yet.
 *
 * @example toDomainNotation('/:slug/')               // => '/{slug}/'
 * @example toDomainNotation('/:primary_tag/:slug/')  // => '/{primary_tag}/{slug}/'
 * @example toDomainNotation('/{slug}/')              // => '/{slug}/' (idempotent)
 *
 * @param {string} permalink permalink in `:slug` (infrastructure) notation
 * @returns {string} permalink in `{slug}` (domain) notation
 */
function toDomainNotation(permalink) {
    return permalink.replace(/:(\w+)/g, '{$1}');
}

module.exports = {
    toExpressNotation,
    toDomainNotation
};
