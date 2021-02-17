const htmlToText = require('html-to-text');

module.exports = function htmlToPlaintext(html) {
    return htmlToText.fromString(html, {
        wordwrap: 80,
        ignoreImage: true,
        hideLinkHrefIfSameAsText: true,
        preserveNewlines: true,
        returnDomByDefault: true,
        uppercaseHeadings: false
    });
};
