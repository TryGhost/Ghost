import {decodeHTMLStrict} from 'entities';

/**
 * Escape HTML special characters
 *
 * Entities are decoded first, so text stored with them isn't escaped twice. Only entities that
 * end in a semicolon: legacy ones without one would turn a URL's `&region=` into `®ion=`.
 */
export function escapeHtml(unsafe: string | null | undefined) {
    return decodeHTMLStrict(unsafe ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
