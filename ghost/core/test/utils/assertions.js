const assert = require('node:assert/strict');
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
 * @param {T} obj
 * @param {Partial<T>} properties
 * @param {string} [message]
 * @returns {void}
 */
function assertObjectMatches(obj, properties, message) {
    for (const [key, value] of Object.entries(properties)) {
        assert.equal(
            obj[key],
            value,
            message || `Property mismatch for key "${key}"`
        );
    }
}

module.exports = {
    assertExists,
    assertMatchSnapshot,
    assertObjectMatches
};
