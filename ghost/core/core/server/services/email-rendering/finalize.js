const juice = require('juice');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');

module.exports = {
    finalize(html) {
        const inlinedHtml = juice(html, {
            inlinePseudoElements: true,
            removeStyleTags: true,
            xmlMode: true
        });

        // html-to-plaintext expects the original HTML document shape and returns
        // undefined for Juice's XHTML-style output.
        const plaintext = htmlToPlaintext.email(html);
        return {html: inlinedHtml, plaintext};
    }
};
