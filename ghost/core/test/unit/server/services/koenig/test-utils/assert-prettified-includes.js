const assert = require('assert/strict');
const prettifyHTML = require('./prettify-html');

function normalizeWhitespace(html) {
    return html
        .replace(/\s+/g, ' ') // Replace all whitespace sequences with a single space
        .replace(/>\s+</g, '><') // Remove spaces between tags
        .trim();
}

function assertPrettifiedIncludes(actual, expected) {
    const actualPrettified = prettifyHTML(actual);
    const expectedPrettified = prettifyHTML(expected);

    const normalizedActual = normalizeWhitespace(actualPrettified);
    const normalizedExpected = normalizeWhitespace(expectedPrettified);

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
