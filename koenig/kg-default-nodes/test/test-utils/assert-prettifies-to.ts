import assert from 'node:assert/strict';
import {prettifyHTML} from './prettify-html.js';

/**
 * Asserts that the given HTML string prettifies to match the expected string
 */
export async function assertPrettifiesTo(actual: string, expected: string): Promise<void> {
    assert.equal(typeof actual, 'string', 'First argument must be a string');
    assert.equal(typeof expected, 'string', 'Second argument must be a string');

    const expectedStr = await prettifyHTML(expected);
    const actualStr = await prettifyHTML(actual);

    assert.equal(actualStr, expectedStr);
}
