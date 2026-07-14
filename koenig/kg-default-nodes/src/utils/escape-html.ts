import {decodeHTML} from 'entities';

/**
 * Escape HTML special characters
 */
export function escapeHtml(unsafe: string | null | undefined) {
    return decodeHTML(unsafe ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
