const Prettier = require('@prettier/sync');
const minify = require('html-minifier').minify;

function prettifyHTML(html) {
    const minified = minify(html, {
        collapseWhitespace: true,
        collapseInlineTagWhitespace: true,
        removeComments: false
    });
    const prettified = Prettier.format(minified, {parser: 'html'});

    return prettified;
}

module.exports = prettifyHTML;
