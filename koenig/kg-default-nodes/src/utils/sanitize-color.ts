// The formats card color settings hold: hex values, keywords such as `accent`
// or `transparent`, and color functions such as rgb(), hsl() or oklch().
const COLOR_PATTERN = /^(?:#[\da-f]{3,8}|[a-z][a-z\d-]*|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([\w\s.,%/+-]+\))$/i;

/**
 * Returns the color if it's in a format a card setting can hold, and the
 * fallback otherwise, so it can be written into an attribute or a CSS
 * declaration as it is.
 */
export function sanitizeColor(color: unknown, fallback = ''): string {
    if (typeof color !== 'string') {
        return fallback;
    }

    const trimmed = color.trim();
    return COLOR_PATTERN.test(trimmed) ? trimmed : fallback;
}
