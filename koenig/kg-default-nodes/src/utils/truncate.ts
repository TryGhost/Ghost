import {escapeHtml} from './escape-html.js';

export function truncateText(text: string, maxLength: number) {
    if (text && text.length > maxLength) {
        return text.substring(0, maxLength - 1).trim() + '\u2026';
    } else {
        return text ?? '';
    }
}

export function truncateHtml(text: string, maxLength: number, maxLengthMobile?: number) {
    // If no mobile length specified or mobile length is larger than desktop,
    // just do a simple truncate
    if (!maxLengthMobile || maxLength <= maxLengthMobile) {
        return escapeHtml(truncateText(text, maxLength));
    }

    // Handle text shorter than mobile length
    if (text.length <= maxLengthMobile) {
        return escapeHtml(text);
    }

    if (text && text.length > maxLengthMobile) {
        let ellipsis = '';

        if (text.length > maxLengthMobile && text.length <= maxLength) {
            ellipsis = '<span class="hide-desktop">\u2026</span>';
        } else if (text.length > maxLength) {
            ellipsis = '\u2026';
        }

        return escapeHtml(text.substring(0, maxLengthMobile - 1)) + '<span class="desktop-only">' + escapeHtml(text.substring(maxLengthMobile - 1, maxLength - 1)) + '</span>' + ellipsis;
    } else {
        return escapeHtml(text ?? '');
    }
}
