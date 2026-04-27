const {cleanupDatabases, initTestEnvVars} = require('./setup-test-env');

module.exports = function () {
    initTestEnvVars();

    return async function () {
        await cleanupDatabases();
    };
};
