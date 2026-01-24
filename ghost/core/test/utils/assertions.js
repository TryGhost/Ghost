const assert = require('node:assert/strict');
const {snapshotManager} = require('@tryghost/express-test').snapshot;

function assertMatchSnapshot(obj, properties) {
    const result = snapshotManager.match(obj, properties);
    assert(result.pass, result.message());
}

module.exports = {
    assertMatchSnapshot
};
