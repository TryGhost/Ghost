const {decodeHTML} = require('entities');

/**
 * Escape HTML special characters
 * @param {string} unsafe
 * @returns string
 */
function escapeHtml(unsafe) {
    return decodeHTML(unsafe ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

module.exports = {
    escapeHtml
};
