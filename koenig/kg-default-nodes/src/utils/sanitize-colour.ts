// The formats card colour settings hold: hex values, keywords such as `accent`
// or `transparent`, and rgb() or hsl() functions.
const COLOUR_PATTERN = /^(?:#[\da-f]{3,8}|[a-z][a-z\d-]*|(?:rgb|hsl)a?\([\d\s.,%/+-]+\))$/i;

/**
 * Returns the colour if it's in a format a card setting can hold, and the
 * fallback otherwise, so it can be written into an attribute or a CSS
 * declaration as it is.
 */
export function sanitizeColour(colour: unknown, fallback = ''): string {
    if (typeof colour !== 'string') {
        return fallback;
    }

    const trimmed = colour.trim();
    return COLOUR_PATTERN.test(trimmed) ? trimmed : fallback;
}
