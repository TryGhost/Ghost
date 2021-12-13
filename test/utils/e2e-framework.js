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
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const uuid = require('uuid');

const fixtures = require('./fixture-utils');
const redirectsUtils = require('./redirects');
const configUtils = require('./configUtils');
const mockUtils = require('./e2e-framework-mock-utils');

const boot = require('../../core/boot');
const TestAgent = require('./test-agent');
const db = require('./db-utils');
const DataGenerator = require('./fixtures/data-generator');

const startGhost = async () => {
    /**
     * We never use the root content folder for testing!
     * We use a tmp folder.
     */
    const contentFolder = path.join(os.tmpdir(), uuid.v4(), 'ghost-test');
    await prepareContentFolder({contentFolder});

    // NOTE: need to pass this config to the server instance
    configUtils.set('paths:contentPath', contentFolder);

    const defaults = {
        backend: true,
        frontend: false,
        server: false
    };

    return boot(defaults);
};

/**
 * Slightly simplified copy-paste from e2e-utils.
 * @param {Object} options
 */
const prepareContentFolder = ({contentFolder, redirectsFile = true, routesFile = true}) => {
    const contentFolderForTests = contentFolder;

    fs.ensureDir(contentFolderForTests);
    fs.ensureDir(path.join(contentFolderForTests, 'data'));
    fs.ensureDir(path.join(contentFolderForTests, 'themes'));
    fs.ensureDir(path.join(contentFolderForTests, 'images'));
    fs.ensureDir(path.join(contentFolderForTests, 'logs'));
    fs.ensureDir(path.join(contentFolderForTests, 'adapters'));
    fs.ensureDir(path.join(contentFolderForTests, 'settings'));

    // Copy all themes into the new test content folder. Default active theme is always casper.
    // If you want to use a different theme, you have to set the active theme (e.g. stub)
    fs.copySync(
        path.join(__dirname, 'fixtures', 'themes'),
        path.join(contentFolderForTests, 'themes')
    );

    if (redirectsFile) {
        redirectsUtils.setupFile(contentFolderForTests, '.yaml');
    }

    if (routesFile) {
        fs.copySync(
            path.join(__dirname, 'fixtures', 'settings', 'routes.yaml'),
            path.join(contentFolderForTests, 'settings', 'routes.yaml')
        );
    }
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
    const originURL = configUtils.config.get('url');
    const ownerUser = {
        email: DataGenerator.Content.users[0].email,
        password: DataGenerator.Content.users[0].password
    };

    return new TestAgent({
        apiURL,
        app,
        originURL,
        ownerUser
    });
};

// request agent
module.exports.getAgent = getAgent;

// state manipulation
module.exports.initFixtures = initFixtures;
module.exports.getFixture = getFixture;
module.exports.resetDb = resetDb;
module.exports.stubMail = mockUtils.stubMail;
module.exports.restoreMocks = mockUtils.restoreMocks;
