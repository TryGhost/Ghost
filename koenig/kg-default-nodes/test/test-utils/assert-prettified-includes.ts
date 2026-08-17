import assert from 'node:assert/strict';
import {minify} from 'html-minifier';
import {prettifyHTML} from './prettify-html.js';

export function assertPrettifiedIncludes(actual: string, expected: string): void {
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
