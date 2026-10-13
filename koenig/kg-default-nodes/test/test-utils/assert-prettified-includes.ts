import assert from 'node:assert/strict';
import {minify} from 'html-minifier-next';
import {prettifyHTML} from './prettify-html.js';

export async function assertPrettifiedIncludes(actual: string, expected: string): Promise<void> {
    const actualPrettified = await prettifyHTML(actual);
    const expectedPrettified = await prettifyHTML(expected);

    const normalizedActual = await minify(actualPrettified, {collapseWhitespace: true, collapseInlineTagWhitespace: true, minifyCSS: true});
    const normalizedExpected = await minify(expectedPrettified, {collapseWhitespace: true, collapseInlineTagWhitespace: true, minifyCSS: true});

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
