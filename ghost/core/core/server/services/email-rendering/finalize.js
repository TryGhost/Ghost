const juice = require('juice');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');

module.exports = {
    finalize(html) {
        const inlinedHtml = juice(html, {inlinePseudoElements: true, removeStyleTags: true});
        const plaintext = htmlToPlaintext.email(inlinedHtml);
        return {html: inlinedHtml, plaintext};
    }
};
