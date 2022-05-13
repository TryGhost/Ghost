module.exports = function htmlToPlaintext(html) {
    const htmlToText = require('html-to-text');

    return htmlToText.fromString(html, {
        wordwrap: false,
        ignoreImage: true,
        hideLinkHrefIfSameAsText: true,
        preserveNewlines: true,
        returnDomByDefault: true,
        uppercaseHeadings: false
    });
};
