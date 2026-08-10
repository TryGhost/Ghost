import assert from 'node:assert/strict';
import {prettifyHTML} from './prettify-html.js';

/**
 * Asserts that the given HTML string prettifies to match the expected string
 */
export function assertPrettifiesTo(actual: string, expected: string): void {
    assert.equal(typeof actual, 'string', 'First argument must be a string');
    assert.equal(typeof expected, 'string', 'Second argument must be a string');

    const expectedStr = prettifyHTML(expected);
    const actualStr = prettifyHTML(actual);

    assert.equal(actualStr, expectedStr);
}
