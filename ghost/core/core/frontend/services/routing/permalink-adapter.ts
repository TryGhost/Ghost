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
