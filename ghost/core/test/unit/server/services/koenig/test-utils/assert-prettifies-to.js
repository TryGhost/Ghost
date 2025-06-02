const Prettier = require('@prettier/sync');
const assert = require('assert/strict');
const minify = require('html-minifier').minify;

/**
 * Asserts that the given HTML string prettifies to match the expected string
 * @param {string} actual - The actual HTML string to test
 * @param {string} expected - The expected HTML string
 */
function assertPrettifiesTo(actual, expected) {
    assert.equal(typeof actual, 'string', 'First argument must be a string');
    assert.equal(typeof expected, 'string', 'Second argument must be a string');

    const minifiedExpected = minify(expected, {collapseWhitespace: true, collapseInlineTagWhitespace: true});
    const expectedStr = Prettier.format(minifiedExpected, {parser: 'html'});

    const minified = minify(actual, {collapseWhitespace: true, collapseInlineTagWhitespace: true});
    const result = Prettier.format(minified, {parser: 'html'});

    assert.equal(result, expectedStr);
}

module.exports = assertPrettifiesTo;
