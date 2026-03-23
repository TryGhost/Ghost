const htmlToPlaintext = require('@tryghost/html-to-plaintext');

/**
 * Recomputes plaintext and excerpt from attrs.html, but only when
 * those fields are already present on the attrs object.
 */
function updateTextAttrs(attrs) {
    if (Object.hasOwn(attrs, 'plaintext') && attrs.html) {
        attrs.plaintext = htmlToPlaintext.excerpt(attrs.html);
    }

    if (!attrs.custom_excerpt && Object.hasOwn(attrs, 'excerpt')) {
        const plaintext = attrs.plaintext || htmlToPlaintext.excerpt(attrs.html);
        attrs.excerpt = plaintext.substring(0, 500);
    }
}

module.exports = {
    updateTextAttrs
};
