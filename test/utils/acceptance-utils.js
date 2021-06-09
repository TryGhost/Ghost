require('../../core/server/overrides');

// Utility Packages
const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const uuid = require('uuid');
const KnexMigrator = require('knex-migrator');
const knexMigrator = new KnexMigrator();

// Ghost Internals
const config = require('../../core/shared/config');
const boot = require('../../core/boot');
const db = require('../../core/server/data/db');
const models = require('../../core/server/models');
const urlService = require('../../core/frontend/services/url');
const settingsService = require('../../core/server/services/settings');
const frontendSettingsService = require('../../core/frontend/services/settings');
const settingsCache = require('../../core/server/services/settings/cache');
const web = require('../../core/server/web');
const themeService = require('../../core/server/services/themes');
const limits = require('../../core/server/services/limits');

// Other Test Utilities
const configUtils = require('./configUtils');
const dbUtils = require('./db-utils');
const urlServiceUtils = require('./url-service-utils');
const redirects = require('./redirects');
const context = require('./fixtures/context');

let ghostServer;
let existingData = {};

/**
 * Because we use ObjectID we don't know the ID of fixtures ahead of time
 * This function fetches all of our fixtures and exposes them so that tests can use them
 * @TODO: Optimize this by making it optional / selective
 */
const exposeFixtures = async () => {
    const fixturePromises = {
        roles: models.Role.findAll({columns: ['id']}),
        users: models.User.findAll({columns: ['id', 'email']}),
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

    if (options.redirectsFile) {
        redirects.setupFile(contentFolderForTests, options.redirectsFileExt);
    }

    if (options.copySettings) {
        fs.copySync(path.join(__dirname, 'fixtures', 'settings', 'routes.yaml'), path.join(contentFolderForTests, 'settings', 'routes.yaml'));
    }
};

// CASE: Ghost Server is Running
// In this case we need to reset things so it's as though Ghost just booted:
// - truncate database
// - re-run default fixtures
// - reload affected services
const restartModeGhostStart = async () => {
    console.log('Restart Mode'); // eslint-disable-line no-console

    // Teardown truncates all tables and also calls urlServiceUtils.reset();
    await dbUtils.teardown();

    // The tables have been truncated, this runs the fixture init task (init file 2) to re-add our default fixtures
    await knexMigrator.init({only: 2});

    // Reset the settings cache
    // @TODO: Prob A: why/how is this different to using settingsCache.reset()
    settingsCache.shutdown();
    await settingsService.init();

    // Reload the frontend
    await frontendSettingsService.init();
    await themeService.init();

    // Reload the URL service & wait for it to be ready again
    // @TODO: Prob B: why/how is this different to urlService.resetGenerators?
    urlServiceUtils.reset();
    urlServiceUtils.init();
    await urlServiceUtils.isFinished();
    // @TODO: why does this happen _after_ URL service
    web.shared.middlewares.customRedirects.reload();

    // Trigger themes to load again
    themeService.loadInactiveThemes();

    // Reload limits service
    limits.init();
};

const bootGhost = async () => {
    ghostServer = await boot();
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
        console.log('Force Start Mode'); // eslint-disable-line no-console
    } else {
        console.log('Fresh Start Mode'); // eslint-disable-line no-console
    }

    // Reset the DB
    await knexMigrator.reset({force: true});

    // Stop the serve (forceStart Mode)
    await stopGhost();

    // Reset the settings cache
    // @TODO: Prob A: why/how is this different to using settingsService.init() and why to do we need this?
    settingsCache.shutdown();
    settingsCache.reset();

    // Do a full database initialisation
    await knexMigrator.init();

    if (config.get('database:client') === 'sqlite3') {
        await db.knex.raw('PRAGMA journal_mode = TRUNCATE;');
    }

    // Reset the URL service generators
    // @TODO: Prob B: why/how is this different to urlService.reset?
    // @TODO: why would we do this on a fresh boot?!
    urlService.resetGenerators();

    // Actually boot Ghost
    await bootGhost(options);

    // Wait for the URL service to be ready, which happens after boot
    await urlServiceUtils.isFinished();
};

const startGhost = async (options) => {
    console.time('Start Ghost'); // eslint-disable-line no-console
    options = _.merge({
        redirectsFile: true,
        redirectsFileExt: '.json',
        forceStart: false,
        copyThemes: true,
        copySettings: true,
        contentFolder: path.join(os.tmpdir(), uuid.v4(), 'ghost-test'),
        subdir: false
    }, options);

    // Ensure we have tmp content folders populated ready for testing
    // @TODO: tidy up the tmp folders after tests
    prepareContentFolder(options);

    if (ghostServer && ghostServer.httpServer && !options.forceStart) {
        await restartModeGhostStart(options);
    } else {
        await freshModeGhostStart(options);
    }

    // Expose fixture data, wrap-up and return
    await exposeFixtures();
    console.timeEnd('Start Ghost'); // eslint-disable-line no-console
    return ghostServer;
};

const stopGhost = async () => {
    if (ghostServer && ghostServer.httpServer) {
        await ghostServer.stop();
        delete require.cache[require.resolve('../../core/app')];
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
