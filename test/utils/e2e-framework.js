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
const {any, stringMatching} = require('@tryghost/jest-snapshot');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const uuid = require('uuid');

const fixtureUtils = require('./fixture-utils');
const redirectsUtils = require('./redirects');
const configUtils = require('./configUtils');
const mockManager = require('./e2e-framework-mock-manager');

const boot = require('../../core/boot');
const TestAgent = require('./test-agent');
const db = require('./db-utils');

/**
 * @param {Object} [options={}]
 * @param {Boolean} [options.backend] Boot the backend
 * @param {Boolean} [options.frontend] Boot the frontend
 * @param {Boolean} [options.server] Start a server
 * @returns {Express.Application} ghost
 */
const startGhost = async (options = {}) => {
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

    // Ensure the DB state
    await resetDb();

    return boot(Object.assign({}, defaults, options));
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

    const fixtureOps = fixtureUtils.getFixtureOps(options);

    return sequence(fixtureOps);
};

const getFixture = (type, index = 0) => {
    return fixtureUtils.DataGenerator.forKnex[type][index];
};

const resetDb = async () => {
    await db.reset();
};

/**
 * Creates a TestAgent which is a drop-in substitution for supertest.
 * It is automatically hooked up to the Admin API so you can make requests to e.g.
 * agent.get('/posts/') without having to worry about URL paths
 *
 * @param {Object} [options={}]
 * @param {Boolean} [options.members] Include members in the boot process
 * @returns {TestAgent} agent
 */
const getAdminAPIAgent = async (options = {}) => {
    const bootOptions = {};

    if (options.members) {
        bootOptions.frontend = true;
    }

    try {
        const app = await startGhost(bootOptions);
        const originURL = configUtils.config.get('url');

        return new TestAgent(app, {
            apiURL: '/ghost/api/canary/admin/',
            originURL
        });
    } catch (error) {
        error.message = `Unable to create test agent. ${error.message}`;
        throw error;
    }
};

/**
 * Creates a TestAgent which is a drop-in substitution for supertest
 * It is automatically hooked up to the Members API so you can make requests to e.g.
 * agent.get('/webhooks/stripe/') without having to worry about URL paths
 *
 * @returns {Promise<TestAgent>} agent
 */
const getMembersAPIAgent = async () => {
    const bootOptions = {
        frontend: true
    };
    try {
        const app = await startGhost(bootOptions);
        const originURL = configUtils.config.get('url');

        return new TestAgent(app, {
            apiURL: '/members/',
            originURL
        });
    } catch (error) {
        error.message = `Unable to create test agent. ${error.message}`;
        throw error;
    }
};

module.exports = {
    // request agent
    agentProvider: {
        getAdminAPIAgent,
        getMembersAPIAgent
    },

    // Mocks and Stubs
    mockManager,

    // DB State Manipulation
    fixtureManager: {
        get: getFixture,
        getCurrentOwnerUser: fixtureUtils.getCurrentOwnerUser,
        init: initFixtures,
        reset: resetDb
    },
    matchers: {
        anyString: any(String),
        anyArray: any(Array),
        anyDate: stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z/),
        anyEtag: stringMatching(/(?:W\/)?"(?:[ !#-\x7E\x80-\xFF]*|\r\n[\t ]|\\.)*"/),
        anyObjectId: stringMatching(/[a-f0-9]{24}/),
        anyErrorId: stringMatching(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/),
        anyUuid: stringMatching(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/),
        stringMatching
    }
};
