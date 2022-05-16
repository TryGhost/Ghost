const downsize = require('downsize');

function generateExcerpt(excerpt, truncateOptions) {
    truncateOptions = truncateOptions || {};

    if (!truncateOptions.words && !truncateOptions.characters) {
        truncateOptions.words = 50;
    }

    // Just uses downsize to truncate, not format
    return downsize(excerpt, truncateOptions);
}

module.exports = generateExcerpt;
