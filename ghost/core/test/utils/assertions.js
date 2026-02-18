const assert = require('node:assert/strict');
const {inspect, isDeepStrictEqual} = require('node:util');
const {isPlainObject} = require('lodash');
const {snapshotManager} = require('@tryghost/express-test').snapshot;

/**
 * @template T
 * @param {T} value
 * @param {string} [message]
 * @returns {asserts value is NonNullable<T>}
 */
function assertExists(value, message = 'Value should exist') {
    assert(
        (value !== undefined) && (value !== null),
        message
    );
}

function assertMatchSnapshot(obj, properties) {
    const result = snapshotManager.match(obj, properties);
    assert(result.pass, result.message());
}

/**
 * @template T
 * @param {ReadonlyArray<T>} arr
 * @param {ReadonlyArray<T>} expectedElements
 * @param {string} [message]
 * @returns {void}
 */
function assertArrayContainsDeep(arr, expectedElements, message) {
    for (const expectedElement of expectedElements) {
        assert(
            arr.some(el => isDeepStrictEqual(el, expectedElement)),
            message || `Expected ${inspect(expectedElement)} to be found`
        );
    }
}

/**
 * @template T
 * @param {T} obj
 * @param {Partial<T>} properties
 * @returns {boolean}
 */
function objectMatches(obj, properties) {
    for (const [key, value] of Object.entries(properties)) {
        const matches = isPlainObject(obj[key])
            ? objectMatches(obj[key], value)
            : isDeepStrictEqual(obj[key], value);
        if (!matches) {
            return false;
        }
    }
    return true;
}

/**
 * @internal
 * @template T
 * @typedef {(
 *     T extends Object
 *         ? {[P in keyof T]?: DeepPartial<T[P]>}
 *         : T
 * )} DeepPartial
 */

/**
 * @template {object} T
 * @param {ReadonlyArray<T>} haystack
 * @param {ReadonlyArray<DeepPartial<T>>} needles
 * @returns {void}
 */
function assertArrayMatchesWithoutOrder(haystack, needles) {
    assert.equal(
        haystack.length,
        needles.length,
        `Expected ${needles.length} items, but got ${haystack.length}`
    );
    for (const a of needles) {
        assert(haystack.some(el => objectMatches(el, a)));
    }
}

/**
 * @template {object} T
 * @param {T} obj
 * @param {DeepPartial<T>} properties
 * @param {string} [message]
 * @returns {void}
 */
function assertObjectMatches(obj, properties, message) {
    for (const [key, value] of Object.entries(properties)) {
        if (isPlainObject(obj[key])) {
            assertObjectMatches(obj[key], value, message);
        } else {
            assert.deepEqual(
                obj[key],
                value,
                message || `Property mismatch for key "${key}"`
            );
        }
    }
}

module.exports = {
    assertExists,
    assertMatchSnapshot,
    assertArrayContainsDeep,
    assertArrayMatchesWithoutOrder,
    assertObjectMatches
};
