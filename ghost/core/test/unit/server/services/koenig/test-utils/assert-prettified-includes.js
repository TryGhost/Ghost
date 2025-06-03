const assert = require('assert/strict');
const minify = require('html-minifier').minify;
const prettifyHTML = require('./prettify-html');

function assertPrettifiedIncludes(actual, expected) {
    const actualPrettified = prettifyHTML(actual);
    const expectedPrettified = prettifyHTML(expected);

    const normalizedActual = minify(actualPrettified, {collapseWhitespace: true, collapseInlineTagWhitespace: true, minifyCSS: true});
    const normalizedExpected = minify(expectedPrettified, {collapseWhitespace: true, collapseInlineTagWhitespace: true, minifyCSS: true});

    const message = [
        'Expected HTML to include substring:',
        '',
        'Received:',
        actualPrettified,
        '',
        'Expected:',
        expectedPrettified
    ].join('\n');

    assert.ok(normalizedActual.includes(normalizedExpected), message);
}

module.exports = assertPrettifiedIncludes;
