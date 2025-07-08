const {escapeHtml} = require('./escape-html');

function truncateText(text, maxLength) {
    if (text && text.length > maxLength) {
        return text.substring(0, maxLength - 1).trim() + '…';
    } else {
        return text ?? '';
    }
}

function truncateHtml(text, maxLength, maxLengthMobile) {
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
            ellipsis = '<span class="hide-desktop">…</span>';
        } else if (text.length > maxLength) {
            ellipsis = '…';
        }

        return escapeHtml(text.substring(0, maxLengthMobile - 1)) + '<span class="desktop-only">' + escapeHtml(text.substring(maxLengthMobile - 1, maxLength - 1)) + '</span>' + ellipsis;
    } else {
        return escapeHtml(text ?? '');
    }
}

module.exports = {
    truncateText,
    truncateHtml
};
