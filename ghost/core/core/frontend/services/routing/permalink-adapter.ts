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

/**
 * Convert an Express / URL-service permalink back into domain-model notation.
 * Will be used on the download path when serialising the canonical shape back
 * to YAML — no production caller yet.
 *
 * @example toDomainNotation('/:slug/')               // => '/{slug}/'
 * @example toDomainNotation('/:primary_tag/:slug/')  // => '/{primary_tag}/{slug}/'
 * @example toDomainNotation('/{slug}/')              // => '/{slug}/' (idempotent)
 */
export function toDomainNotation(permalink: string): string {
    return permalink.replace(/:(\w+)/g, '{$1}');
}
