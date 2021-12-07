// Set of common function that should be main building blocks for e2e tests.
// The e2e tests usually consist of following building blocks:
// - request agent
// - state builder
// - output state checker (in case we don't get jest snapshots working)
//
// The request agetnt is responsible for making HTTP-like requests to an application (express app in case of Ghost).
// Note there's no actual need to make an HTTP request to an actual server, bypassing HTTP and hooking into the application
// directly is enough and reduces dependence on blocking a port (allows to run tests in parallel).
//
// The state builder is responsible for building the state of the application. Usually it's done by using pre-defined fixtures.
// Can include building a DB state, file system state (themes, config files), building configuration state (config files) etc.
//
// The output state checker is responsible for checking the response from the app after performing a request.
const _ = require('lodash');
const {sequence} = require('@tryghost/promise');
const fixtures = require('./fixture-utils');

const boot = require('../../core/boot');
const TestAgent = require('./test-agent');
const db = require('./db-utils');

const startGhost = async () => {
    const defaults = {
        backend: true,
        frontend: false,
        server: false
    };

    return boot(defaults);
};

/**
 * Database state builder. By default inserts an owner user into the database.
 * @param  {...any} [options]
 * @returns {Promise<void>}
 */
const initFixtures = async (...options) => {
    // No DB setup, but override the owner
    options = _.merge({'owner:post': true}, _.transform(options, function (result, val) {
        if (val) {
            result[val] = true;
        }
    }));

    const fixtureOps = fixtures.getFixtureOps(options);

    return sequence(fixtureOps);
};

const getFixture = (type, index = 0) => {
    return fixtures.DataGenerator.forKnex[type][index];
};

const resetDb = async () => {
    await db.teardown();
};

/**
 * Creates a TestAgent which is a drop-in substitution for supertest hooked into Ghost.
 * @param {String} apiURL
 * @returns {TestAgent}
 */
const getAgent = async (apiURL) => {
    const app = await startGhost();

    return new TestAgent(apiURL, app);
};

// request agent
module.exports.getAgent = getAgent;

// state building
module.exports.initFixtures = initFixtures;
module.exports.getFixture = getFixture;
module.exports.resetDb = resetDb;
