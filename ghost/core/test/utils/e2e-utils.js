// Utility Packages
const debug = require('@tryghost/debug')('test');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Ghost Internals
const boot = require('../../core/boot');
const models = require('../../core/server/models');
const urlService = require('../../core/server/services/url');
const settingsService = require('../../core/server/services/settings/settings-service');
const adapterManager = require('../../core/server/services/adapter-manager');

// Other Test Utilities
const configUtils = require('./configUtils');
const dbUtils = require('./db-utils');
const urlServiceUtils = require('./url-service-utils');
const redirects = require('./redirects');
const context = require('./fixtures/context');

let ghostServer;
let existingData = {};
let totalStartTime = 0;
let totalBoots = 0;

/**
 * Because we use ObjectID we don't know the ID of fixtures ahead of time
 * This function fetches all of our fixtures and exposes them so that tests can use them
 * @TODO: Optimize this by making it optional / selective
 */
const exposeFixtures = async () => {
    const fixturePromises = {
        roles: models.Role.findAll({columns: ['id', 'name']}),
        users: models.User.findAll({columns: ['id', 'email', 'slug']}),
        tags: models.Tag.findAll({columns: ['id']}),
        apiKeys: models.ApiKey.findAll({withRelated: 'integration'})
    };
    const keys = Object.keys(fixturePromises);
    existingData = {};

    return Promise
        .all(Object.values(fixturePromises))
        .then((results) => {
            for (let i = 0; i < keys.length; i += 1) {
                existingData[keys[i]] = results[i].toJSON(context.internal);
            }
        })
        .catch((err) => {
            console.error('Unable to expose fixtures', err); // eslint-disable-line no-console
            process.exit(1);
        });
};

const prepareContentFolder = async (options) => {
    const contentFolderForTests = options.contentFolder;

    /**
     * We never use the root content folder for testing!
     * We use a tmp folder.
     */
    configUtils.set('paths:contentPath', contentFolderForTests);

    await fs.ensureDir(contentFolderForTests);
    await fs.ensureDir(path.join(contentFolderForTests, 'data'));
    await fs.ensureDir(path.join(contentFolderForTests, 'themes'));
    await fs.ensureDir(path.join(contentFolderForTests, 'images'));
    await fs.ensureDir(path.join(contentFolderForTests, 'logs'));
    await fs.ensureDir(path.join(contentFolderForTests, 'adapters'));
    await fs.ensureDir(path.join(contentFolderForTests, 'settings'));

    if (options.copyThemes) {
        // Copy all themes into the new test content folder. Default active theme is always source. If you want to use a different theme, you have to set the active theme (e.g. stub)
        await fs.copy(path.join(__dirname, 'fixtures', 'themes'), path.join(contentFolderForTests, 'themes'));
    }

    // Copy theme even if frontend is disabled, as admin can use source when viewing themes section
    await fs.copy(path.join(__dirname, 'fixtures', 'themes', 'source'), path.join(contentFolderForTests, 'themes', 'source'));

    if (options.redirectsFile) {
        await redirects.setupFile(contentFolderForTests, options.redirectsFileExt);
    }

    if (options.routesFilePath) {
        await fs.copy(options.routesFilePath, path.join(contentFolderForTests, 'settings', 'routes.yaml'));
    } else if (options.copySettings) {
        await fs.copy(path.join(__dirname, 'fixtures', 'settings', 'routes.yaml'), path.join(contentFolderForTests, 'settings', 'routes.yaml'));
    }

    // Used by newsletter fixtures
    await fs.ensureDir(path.join(contentFolderForTests, 'images', '2022', '05'));
    const GIF1x1 = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');
    await fs.writeFile(path.join(contentFolderForTests, 'images', '2022', '05', 'test.jpg'), GIF1x1);
};

// Stop Ghost if it's running, reset the DB, and start Ghost
const _startGhost = async (options) => {
    // Stop the server -- noops if it's not running
    await stopGhost();

    // Adapter cache has to be cleared to avoid reusing cached adapter instances between restarts
    adapterManager.clearCache();

    // Reset the settings cache and disable listeners so they don't get triggered further
    settingsService.reset();

    await dbUtils.reset();

    await settingsService.init();

    // Actually boot Ghost
    ghostServer = await boot({
        backend: options.backend,
        frontend: options.frontend,
        server: options.server
    });

    // Wait for the URL service to be ready, which happens after boot
    if (options.frontend) {
        await urlServiceUtils.isFinished();
    }
};

/**
 *
 * @param {Object} [options]
 * @param {boolean} [options.backend]
 * @param {boolean} [options.frontend]
 * @param {boolean} [options.redirectsFile]
 * @param {String} [options.redirectsFileExt]
 * @param {boolean} [options.copyThemes]
 * @param {boolean} [options.copySettings]
 * @param {String} [options.routesFilePath] - path to a routes configuration file to start the instance with
 * @param {String} [options.contentFolder]
 * @param {boolean} [options.subdir]
 * @returns {Promise<GhostServer>}
 */
const startGhost = async (options) => {
    const startTime = Date.now();
    debug('Start Ghost');
    options = _.merge({
        backend: true,
        frontend: true,
        redirectsFile: false,
        redirectsFileExt: '.json',
        copyThemes: false,
        copySettings: false,
        contentFolder: path.join(os.tmpdir(), crypto.randomUUID(), 'ghost-test'),
        subdir: false
    }, options);

    // @TODO: tidy up the tmp folders after tests
    await prepareContentFolder(options);

    await _startGhost(options);

    // Expose fixture data, wrap-up and return
    await exposeFixtures();

    // Reporting
    const totalTime = Date.now() - startTime;
    totalStartTime += totalTime;
    totalBoots += 1;
    const averageBootTime = Math.round(totalStartTime / totalBoots);
    debug(`[e2e-utils] Started Ghost in ${totalTime / 1000}s`);
    debug(`[e2e-utils] Accumulated start time across ${totalBoots} boots is ${totalStartTime / 1000}s (average = ${averageBootTime}ms)`);
    return ghostServer;
};

const stopGhost = async () => {
    if (ghostServer && ghostServer.httpServer) {
        await ghostServer.stop();
        delete require.cache[require.resolve('../../core/app')];
        // NOTE: similarly to urlService.reset() there doesn't seem to be a need for this call
        //       probable best location for this type of cleanup if it's needed is registering
        //       a hood during the "server cleanup" phase of the server stop
        urlService.resetGenerators();
    }
};

module.exports = {
    startGhost,
    stopGhost,
    getExistingData: () => {
        return existingData;
    }
};
