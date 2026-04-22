import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content
 *
 * @param {string} html - The HTML string to sanitize
 * @returns {string} - The sanitized HTML string
 */
export function sanitizeHtml(html) {
    if (!html) {
        return '';
    }

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['a', 'b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
    });
}

/**
 * Validates hex color
 * Returns the color if valid or an empty string
 *
 * @param {string} color - The color value to validate
 * @returns {string} - The validated hex color or empty string
 */
export function validateHexColor(color) {
    if (!color || typeof color !== 'string') {
        return '';
    }

    // Matches #RGB, #RRGGBB, #RGBA, #RRGGBBAA
    const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
    if (!hexColorRegex.test(color)) {
        return '';
    }

    return color;
}
