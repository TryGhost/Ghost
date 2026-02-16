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
    assertObjectMatches
};
