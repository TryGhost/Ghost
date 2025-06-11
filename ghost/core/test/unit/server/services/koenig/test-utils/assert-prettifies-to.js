const assert = require('assert/strict');
const prettifyHTML = require('./prettify-html');

/**
 * Asserts that the given HTML string prettifies to match the expected string
 * @param {string} actual - The actual HTML string to test
 * @param {string} expected - The expected HTML string
 */
function assertPrettifiesTo(actual, expected) {
    assert.equal(typeof actual, 'string', 'First argument must be a string');
    assert.equal(typeof expected, 'string', 'Second argument must be a string');

    const expectedStr = prettifyHTML(expected);
    const actualStr = prettifyHTML(actual);

    assert.equal(actualStr, expectedStr);
}

module.exports = assertPrettifiesTo;
