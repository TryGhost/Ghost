// Set of common function that should be main building blocks for e2e tests.
// The e2e tests usually consist of following building blocks:
// - request agent
// - state builder
// - output state checker (in case we don't get jest snapshots working)
//
// The request agent is responsible for making HTTP-like requests to an application (express app in case of Ghost).
// Note there's no actual need to make an HTTP request to an actual server, bypassing HTTP and hooking into the application
// directly is enough and reduces dependence on blocking a port (allows to run tests in parallel).
//
// The state builder is responsible for building the state of the application. Usually it's done by using pre-defined fixtures.
// Can include building a DB state, file system state (themes, config files), building configuration state (config files) etc.
//
// The output state checker is responsible for checking the response from the app after performing a request.
const _ = require('lodash');
const debug = require('@tryghost/debug')('test');
const {sequence} = require('@tryghost/promise');
const {any, stringMatching} = require('@tryghost/express-test').snapshot;
const {AsymmetricMatcher} = require('expect');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const uuid = require('uuid');

const fixtureUtils = require('./fixture-utils');
const redirectsUtils = require('./redirects');
const configUtils = require('./configUtils');
const urlServiceUtils = require('./url-service-utils');
const mockManager = require('./e2e-framework-mock-manager');
const mentionsJobsService = require('../../core/server/services/mentions-jobs');
const jobsService = require('../../core/server/services/jobs');

const boot = require('../../core/boot');
const {AdminAPITestAgent, ContentAPITestAgent, GhostAPITestAgent, MembersAPITestAgent} = require('./agents');
const db = require('./db-utils');

// Services that need resetting
const settingsService = require('../../core/server/services/settings/settings-service');
const supertest = require('supertest');
const {stopGhost} = require('./e2e-utils');
const adapterManager = require('../../core/server/services/adapter-manager');
const DomainEvents = require('@tryghost/domain-events');

// Require additional assertions which help us keep our tests small and clear
require('./assertions');

let totalResetTime = 0;
let totalStartTime = 0;
let totalBoots = 0;

/**
 * @param {Object} [options={}]
 * @param {Boolean} [options.backend] Boot the backend
 * @param {Boolean} [options.frontend] Boot the frontend
 * @param {Boolean} [options.server] Start a server
 * @returns {Promise<Express.Application>} ghost
 */
const startGhost = async (options = {}) => {
    await mentionsJobsService.allSettled();
    await jobsService.allSettled();
    await DomainEvents.allSettled();

    /**
     * We never use the root content folder for testing!
     * We use a tmp folder.
     */
    const contentFolder = path.join(os.tmpdir(), uuid.v4(), 'ghost-test');
    await prepareContentFolder({contentFolder});

    // NOTE: need to pass this config to the server instance
    configUtils.set('paths:contentPath', contentFolder);

    // Adapter cache has to be cleared to avoid reusing cached adapter instances between restarts
    adapterManager.clearCache();

    // Reset the URL service so we clear out all the listeners
    urlServiceUtils.resetGenerators();

    const defaults = {
        backend: true,
        frontend: false,
        server: false
    };

    // Ensure the state of all data, including DB and caches
    const resetDataNow = Date.now();
    await resetData();
    totalResetTime += Date.now() - resetDataNow;

    const bootOptions = Object.assign({}, defaults, options);

    const bootNow = Date.now();
    const ghostServer = await boot(bootOptions);
    const bootTime = Date.now() - bootNow;
    totalStartTime += bootTime;
    totalBoots += 1;

    if (bootOptions.frontend) {
        await urlServiceUtils.isFinished();
    }

    // Disable network in tests at the start
    mockManager.disableNetwork();

    debug(`[e2e-framework] Started Ghost in ${bootTime / 1000}s`);
    debug(`[e2e-framework] Accumulated start time across ${totalBoots} boots is ${totalStartTime / 1000}s (average = ${Math.round(totalStartTime / totalBoots)}ms)`);
    debug(`[e2e-framework] Accumulated reset time across ${totalBoots} boots is ${totalResetTime / 1000}s (average = ${Math.round(totalResetTime / totalBoots)}ms)`);

    return ghostServer;
};

/**
 * Slightly simplified copy-paste from e2e-utils.
 * @param {Object} options
 */
const prepareContentFolder = async ({contentFolder, redirectsFile = true, routesFile = true}) => {
    const contentFolderForTests = contentFolder;

    await fs.ensureDir(contentFolderForTests);
    await fs.ensureDir(path.join(contentFolderForTests, 'data'));
    await fs.ensureDir(path.join(contentFolderForTests, 'themes'));
    await fs.ensureDir(path.join(contentFolderForTests, 'images'));
    await fs.ensureDir(path.join(contentFolderForTests, 'logs'));
    await fs.ensureDir(path.join(contentFolderForTests, 'adapters'));
    await fs.ensureDir(path.join(contentFolderForTests, 'settings'));

    // Copy all themes into the new test content folder. Default active theme is always casper.
    // If you want to use a different theme, you have to set the active theme (e.g. stub)
    await fs.copy(
        path.join(__dirname, 'fixtures', 'themes'),
        path.join(contentFolderForTests, 'themes')
    );

    if (redirectsFile) {
        redirectsUtils.setupFile(contentFolderForTests, '.yaml');
    }

    if (routesFile) {
        await fs.copy(
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

/**
 * Reset rate limit instances (not the brute table)
 */
const resetRateLimits = async () => {
    // Reset rate limiting instances
    const {spamPrevention} = require('../../core/server/web/shared/middleware/api');
    spamPrevention.reset();
};

/**
 * This function ensures that Ghost's data is reset back to "factory settings"
 *
 */
const resetData = async () => {
    // Calling reset on the database also causes the fixtures to be re-run
    // We need to unhook the settings events and restore the cache before we do this
    // Otherwise, the fixtures being restored will refer to the old settings cache data
    settingsService.reset();

    // Clear out the database
    await db.reset({truncate: true});

    // Reset rate limiting instances (resetting the table is not enough!)
    await resetRateLimits();
};

/**
 * Creates a ContentAPITestAgent which is a drop-in substitution for supertest.
 * It is automatically hooked up to the Content API so you can make requests to e.g.
 * agent.get('/posts/') without having to worry about URL paths
 * @returns {Promise<InstanceType<ContentAPITestAgent>>} agent
 */
const getContentAPIAgent = async () => {
    try {
        const app = await startGhost();
        const originURL = configUtils.config.get('url');

        return new ContentAPITestAgent(app, {
            apiURL: '/ghost/api/content/',
            originURL
        });
    } catch (error) {
        error.message = `Unable to create test agent. ${error.message}`;
        throw error;
    }
};

/**
 * Creates a AdminAPITestAgent which is a drop-in substitution for supertest.
 * It is automatically hooked up to the Admin API so you can make requests to e.g.
 * agent.get('/posts/') without having to worry about URL paths
 *
 * @param {Object} [options={}]
 * @param {Boolean} [options.members] Include members in the boot process
 * @returns {Promise<InstanceType<AdminAPITestAgent>>} agent
 */
const getAdminAPIAgent = async (options = {}) => {
    const bootOptions = {};

    if (options.members) {
        bootOptions.frontend = true;
    }

    try {
        const app = await startGhost(bootOptions);
        const originURL = configUtils.config.get('url');

        return new AdminAPITestAgent(app, {
            apiURL: '/ghost/api/admin/',
            originURL
        });
    } catch (error) {
        error.message = `Unable to create test agent. ${error.message}`;
        throw error;
    }
};

/**
 * Creates a MembersAPITestAgent which is a drop-in substitution for supertest
 * It is automatically hooked up to the Members API so you can make requests to e.g.
 * agent.get('/webhooks/stripe/') without having to worry about URL paths
 *
 * @returns {Promise<InstanceType<MembersAPITestAgent>>} agent
 */
const getMembersAPIAgent = async () => {
    const bootOptions = {
        frontend: true
    };
    try {
        const app = await startGhost(bootOptions);
        const originURL = configUtils.config.get('url');

        return new MembersAPITestAgent(app, {
            apiURL: '/members/',
            originURL
        });
    } catch (error) {
        error.message = `Unable to create test agent. ${error.message}`;
        throw error;
    }
};

/**
 * Creates a MembersAPITestAgent which is a drop-in substitution for supertest
 * It is automatically hooked up to the Members API so you can make requests to e.g.
 * agent.get('/webhooks/stripe/') without having to worry about URL paths
 *
 * @returns {Promise<InstanceType<GhostAPITestAgent>>} agent
 */
const getWebmentionsAPIAgent = async () => {
    const bootOptions = {
        frontend: true
    };
    try {
        const app = await startGhost(bootOptions);
        const originURL = configUtils.config.get('url');

        return new GhostAPITestAgent(app, {
            apiURL: '/webmentions/',
            originURL
        });
    } catch (error) {
        error.message = `Unable to create test agent. ${error.message}`;
        throw error;
    }
};

/**
 * Creates a GhostAPITestAgent, which is a drop-in substitution for supertest
 * It is automatically hooked up to the Ghost API so you can make requests to e.g.
 * agent.get('/well-known/jwks.json') without having to worry about URL paths
 *
 * @returns {Promise<InstanceType<GhostAPITestAgent>>} agent
 */
const getGhostAPIAgent = async () => {
    const bootOptions = {
        frontend: false
    };

    try {
        const app = await startGhost(bootOptions);
        const originURL = configUtils.config.get('url');

        return new GhostAPITestAgent(app, {
            apiURL: '/ghost/',
            originURL
        });
    } catch (error) {
        error.message = `Unable to create test agent. ${error.message}`;
        throw error;
    }
};

/**
 *
 * @returns {Promise<{adminAgent: InstanceType<AdminAPITestAgent>, membersAgent: InstanceType<MembersAPITestAgent>}>} agents
 */
const getAgentsForMembers = async () => {
    let membersAgent;
    let adminAgent;

    const bootOptions = {
        frontend: true
    };

    try {
        const app = await startGhost(bootOptions);
        const originURL = configUtils.config.get('url');

        membersAgent = new MembersAPITestAgent(app, {
            apiURL: '/members/',
            originURL
        });
        adminAgent = new AdminAPITestAgent(app, {
            apiURL: '/ghost/api/admin/',
            originURL
        });
    } catch (error) {
        error.message = `Unable to create test agent. ${error.message}`;
        throw error;
    }

    return {
        adminAgent,
        membersAgent
    };
};

/**
 * WARNING: when using this, you should stop the returned ghostServer after the tests.
 * @NOTE: for now method returns a supertest agent for Frontend instead of test agent with snapshot support.
 *        frontendAgent should be returning an instance of TestAgent (related: https://github.com/TryGhost/Toolbox/issues/471)
 *  @returns {Promise<{adminAgent: InstanceType<AdminAPITestAgent>, membersAgent: InstanceType<MembersAPITestAgent>, frontendAgent: InstanceType<supertest.SuperAgentTest>, contentAPIAgent: InstanceType<ContentAPITestAgent>, ghostServer: Express.Application}>} agents
 */
const getAgentsWithFrontend = async () => {
    let ghostServer;
    let membersAgent;
    let adminAgent;
    let frontendAgent;
    let contentAPIAgent;

    const bootOptions = {
        frontend: true,
        server: true
    };
    try {
        // Possible that we still have a running Ghost server from a previous old E2E test
        // Those tests never stopped the server in the tests manually
        await stopGhost();

        // Start a new Ghost server with real HTTP listener
        ghostServer = await startGhost(bootOptions);
        const app = ghostServer.rootApp;

        const originURL = configUtils.config.get('url');

        membersAgent = new MembersAPITestAgent(app, {
            apiURL: '/members/',
            originURL
        });
        adminAgent = new AdminAPITestAgent(app, {
            apiURL: '/ghost/api/admin/',
            originURL
        });
        contentAPIAgent = new ContentAPITestAgent(app, {
            apiURL: '/ghost/api/content/',
            originURL
        });
        frontendAgent = supertest.agent(originURL);
    } catch (error) {
        error.message = `Unable to create test agent. ${error.message}`;
        throw error;
    }

    return {
        adminAgent,
        membersAgent,
        frontendAgent,
        contentAPIAgent,
        // @NOTE: ghost server should not be exposed ideally, it's a hack (see commit message)
        ghostServer
    };
};

const insertWebhook = ({event, url}) => {
    return fixtureUtils.fixtures.insertWebhook({
        event: event,
        target_url: url
    });
};

class Nullable extends AsymmetricMatcher {
    constructor(sample) {
        super(sample);
    }

    asymmetricMatch(other) {
        if (other === null) {
            return true;
        }

        return this.sample.asymmetricMatch(other);
    }

    toString() {
        return `Nullable<${this.sample.toString()}>`;
    }

    getExpectedType() {
        return `null|${this.sample.getExpectedType()}`;
    }

    toAsymmetricMatcher() {
        return `Nullable<${this.sample.toAsymmetricMatcher ? this.sample.toAsymmetricMatcher() : this.sample.toString()}>`;
    }
}

module.exports = {
    // request agent
    agentProvider: {
        getAdminAPIAgent,
        getMembersAPIAgent,
        getWebmentionsAPIAgent,
        getContentAPIAgent,
        getAgentsForMembers,
        getGhostAPIAgent,
        getAgentsWithFrontend
    },
    // @NOTE: startGhost only exposed for playwright tests
    startGhost,
    // Mocks and Stubs
    mockManager,

    // DB State Manipulation
    fixtureManager: {
        get: getFixture,
        insertWebhook: insertWebhook,
        getCurrentOwnerUser: fixtureUtils.getCurrentOwnerUser,
        init: initFixtures,
        restore: resetData,
        getPathForFixture: (fixturePath) => {
            return path.join(__dirname, 'fixtures', fixturePath);
        }
    },
    regexes: {
        anyMajorMinorVersion: /v\d+\.\d+/gi,
        queryStringToken: paramName => new RegExp(`${paramName}=(\\w|-)+`, 'g')
    },
    matchers: {
        anyBoolean: any(Boolean),
        anyString: any(String),
        anyArray: any(Array),
        anyObject: any(Object),
        anyNumber: any(Number),
        nullable: expectedObject => new Nullable(expectedObject), // usage: nullable(anyString)
        anyStringNumber: stringMatching(/\d+/),
        anyISODateTime: stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z/),
        anyISODate: stringMatching(/\d{4}-\d{2}-\d{2}/),
        anyISODateTimeWithTZ: stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000\+\d{2}:\d{2}/),
        anyEtag: stringMatching(/(?:W\/)?"(?:[ !#-\x7E\x80-\xFF]*|\r\n[\t ]|\\.)*"/),
        anyContentLength: stringMatching(/\d+/),
        anyContentVersion: stringMatching(/v\d+\.\d+/),
        anyObjectId: stringMatching(/[a-f0-9]{24}/),
        anyErrorId: stringMatching(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/),
        anyUuid: stringMatching(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/),
        anyLocationFor: (resource) => {
            return stringMatching(new RegExp(`https?://.*?/${resource}/[a-f0-9]{24}/`));
        },
        anyGhostAgent: stringMatching(/Ghost\/\d+\.\d+\.\d+\s\(https:\/\/github.com\/TryGhost\/Ghost\)/),
        // @NOTE: hack here! it's due to https://github.com/TryGhost/Toolbox/issues/341
        //        this matcher should be removed once the issue is solved - routing is redesigned
        //        An ideal solution would be removal of this matcher altogether.
        anyLocalURL: stringMatching(/http:\/\/127.0.0.1:2369\/[A-Za-z0-9_-]+\//),
        stringMatching
    },

    // utilities
    configUtils: require('./configUtils'),
    dbUtils: require('./db-utils'),
    urlUtils: require('./urlUtils'),
    resetRateLimits
};
