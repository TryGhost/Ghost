// Copied from ghost/core/core/frontend/services/routing/permalink-adapter.ts @ 407e032dc7 —
// transforms: none beyond the provenance header (byte-identical body).
/**
 * Convert a domain-model permalink into Express / URL-service notation.
 *
 * @example toExpressNotation('/{slug}/')               // => '/:slug/'
 * @example toExpressNotation('/{primary_tag}/{slug}/') // => '/:primary_tag/:slug/'
 * @example toExpressNotation('/:slug/')                // => '/:slug/' (idempotent)
 */
export function toExpressNotation(permalink: string): string {
    return permalink.replace(/{(\w+)}/g, ':$1');
}
