// Utility Packages
const debug = require('@tryghost/debug')('test');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const uuid = require('uuid');

// Ghost Internals
const boot = require('../../core/boot');
const models = require('../../core/server/models');
const urlService = require('../../core/server/services/url');
const settingsService = require('../../core/server/services/settings/settings-service');
const routeSettingsService = require('../../core/server/services/route-settings');
const themeService = require('../../core/server/services/themes');
const limits = require('../../core/server/services/limits');
const customRedirectsService = require('../../core/server/services/custom-redirects');
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

const prepareContentFolder = (options) => {
    const contentFolderForTests = options.contentFolder;

    /**
     * We never use the root content folder for testing!
     * We use a tmp folder.
     */
    configUtils.set('paths:contentPath', contentFolderForTests);

    fs.ensureDirSync(contentFolderForTests);
    fs.ensureDirSync(path.join(contentFolderForTests, 'data'));
    fs.ensureDirSync(path.join(contentFolderForTests, 'themes'));
    fs.ensureDirSync(path.join(contentFolderForTests, 'images'));
    fs.ensureDirSync(path.join(contentFolderForTests, 'logs'));
    fs.ensureDirSync(path.join(contentFolderForTests, 'adapters'));
    fs.ensureDirSync(path.join(contentFolderForTests, 'settings'));

    if (options.copyThemes) {
        // Copy all themes into the new test content folder. Default active theme is always casper. If you want to use a different theme, you have to set the active theme (e.g. stub)
        fs.copySync(path.join(__dirname, 'fixtures', 'themes'), path.join(contentFolderForTests, 'themes'));
    }

    // Copy theme even if frontend is disabled, as admin can use casper when viewing themes section
    fs.copySync(path.join(__dirname, 'fixtures', 'themes', 'casper'), path.join(contentFolderForTests, 'themes', 'casper'));

    if (options.redirectsFile) {
        redirects.setupFile(contentFolderForTests, options.redirectsFileExt);
    }

    if (options.routesFilePath) {
        fs.copySync(options.routesFilePath, path.join(contentFolderForTests, 'settings', 'routes.yaml'));
    } else if (options.copySettings) {
        fs.copySync(path.join(__dirname, 'fixtures', 'settings', 'routes.yaml'), path.join(contentFolderForTests, 'settings', 'routes.yaml'));
    }

    // Used by newsletter fixtures
    fs.ensureDirSync(path.join(contentFolderForTests, 'images', '2022', '05'));
    const GIF1x1 = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');
    fs.writeFileSync(path.join(contentFolderForTests, 'images', '2022', '05', 'test.jpg'), GIF1x1);
};

// CASE: Ghost Server is Running
// In this case we need to reset things so it's as though Ghost just booted:
// - truncate database
// - re-run default fixtures
// - reload affected services
const restartModeGhostStart = async ({frontend, copyThemes, copySettings}) => {
    debug('Reload Mode');

    // TODO: figure out why we need this if we reset again later?
    urlServiceUtils.reset();

    await dbUtils.reset({truncate: true});

    debug('init done');

    // Adapter cache has to be cleared to avoid reusing cached adapter instances between restarts
    adapterManager.clearCache();

    // Reset the settings cache
    await settingsService.init();
    debug('settings done');

    if (copySettings) {
        await routeSettingsService.init();
    }
    if (copyThemes || frontend) {
        await themeService.init();
    }
    if (copyThemes) {
        await themeService.loadInactiveThemes();
    }

    // Reload the URL service & wait for it to be ready again
    // @TODO: why/how is this different to urlService.resetGenerators?
    urlServiceUtils.reset();
    urlServiceUtils.init({urlCache: !frontend});

    if (frontend) {
        await urlServiceUtils.isFinished();
    }

    debug('routes done');

    await customRedirectsService.init();

    // Reload limits service
    limits.init();
};

// CASE: Ghost Server needs Starting
// In this case we need to ensure that Ghost is started cleanly:
// - ensure the DB is reset
// - CASE: If we are in force start mode the server is already running so we
//      - stop the server (if we are in force start mode it will be running)
//      - reload affected services - just settings and not the frontend!?
// - Start Ghost: Uses OLD Boot process
const freshModeGhostStart = async (options) => {
    if (options.forceStart) {
        debug('Forced Restart Mode');
    } else {
        debug('Fresh Start Mode');
    }

    // Stop the server (forceStart Mode)
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
 * @param {boolean} [options.forceStart]
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
        forceStart: false,
        copyThemes: false,
        copySettings: false,
        contentFolder: path.join(os.tmpdir(), uuid.v4(), 'ghost-test'),
        subdir: false
    }, options);

    // @TODO: tidy up the tmp folders after tests
    prepareContentFolder(options);

    if (ghostServer && ghostServer.httpServer && !options.forceStart) {
        await restartModeGhostStart(options);
    } else {
        await freshModeGhostStart(options);
    }

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
