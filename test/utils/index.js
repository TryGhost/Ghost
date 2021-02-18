require('../../core/server/overrides');

// Utility Packages
const Promise = require('bluebird');
const {sequence} = require('@tryghost/promise');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const uuid = require('uuid');
const KnexMigrator = require('knex-migrator');
const knexMigrator = new KnexMigrator();

// Ghost Internals
const config = require('../../core/shared/config');
const express = require('../../core/shared/express');
const ghost = require('../../core/server');
const GhostServer = require('../../core/server/ghost-server');
const {events} = require('../../core/server/lib/common');
const db = require('../../core/server/data/db');
const models = require('../../core/server/models');
const urlUtils = require('../../core/shared/url-utils');
const urlService = require('../../core/frontend/services/url');
const settingsService = require('../../core/server/services/settings');
const frontendSettingsService = require('../../core/frontend/services/settings');
const settingsCache = require('../../core/server/services/settings/cache');
const web = require('../../core/server/web');
const themes = require('../../core/frontend/services/themes');

// Other Test Utilities
const APIUtils = require('./api');
const configUtils = require('./configUtils');
const dbUtils = require('./db-utils');
const fixtureUtils = require('./fixture-utils');
const urlServiceUtils = require('./url-service-utils');
const oldIntegrationUtils = require('./old-integration-utils');
const redirects = require('./redirects');
const cacheRules = require('./fixtures/cache-rules');
const context = require('./fixtures/context');
const DataGenerator = require('./fixtures/data-generator');
const filterData = require('./fixtures/filter-param');

// Require additional assertions which help us keep our tests small and clear
require('./assertions');

// ## Test Setup and Teardown

const initFixtures = function initFixtures() {
    const options = _.merge({init: true}, _.transform(arguments, function (result, val) {
        result[val] = true;
    }));

    const fixtureOps = fixtureUtils.getFixtureOps(options);

    return sequence(fixtureOps);
};

/**
 * ## Setup Integration Tests
 * Setup takes a list of arguments like: 'default', 'tag', 'perms:tag', 'perms:init'
 * Setup does 'init' (DB) by default
 * @returns {Function}
 */
const setup = function setup() {
    /*eslint no-invalid-this: "off"*/
    const self = this;

    const args = arguments;

    return function innerSetup() {
        models.init();
        return initFixtures.apply(self, args);
    };
};

const createUser = function createUser(options) {
    const user = options.user;
    const role = options.role;

    return models.Role.fetchAll(context.internal)
        .then(function (roles) {
            roles = roles.toJSON();
            user.roles = [_.find(roles, {name: role})];

            return models.User.add(user, context.internal)
                .then(function () {
                    return user;
                });
        });
};

const createPost = function createPost(options) {
    const post = DataGenerator.forKnex.createPost(options.post);

    if (options.author) {
        post.author_id = options.author.id;
    }

    post.authors = [{id: post.author_id}];
    return models.Post.add(post, context.internal);
};

const createEmail = function createEmail(options) {
    const email = DataGenerator.forKnex.createEmail(options.email);
    return models.Email.add(email, context.internal);
};

const createEmailedPost = async function createEmailedPost({postOptions, emailOptions}) {
    const post = await createPost(postOptions);
    emailOptions.email.post_id = post.id;
    const email = await createEmail(emailOptions);

    return {post, email};
};

let ghostServer;

const dirtyDataFunction = () => {
    /**
     * @TODO: this is dirty, but makes routing testing a lot easier for now, because the routing test
     * has no easy way to access existing resource id's, which are added from the Ghost fixtures.
     * I can do `testUtils.existingData.roles[0].id`.
     */
    module.exports.existingData = {};
    return models.Role.findAll({columns: ['id']})
        .then((roles) => {
            module.exports.existingData.roles = roles.toJSON();

            return models.User.findAll({columns: ['id', 'email']});
        })
        .then((users) => {
            module.exports.existingData.users = users.toJSON(context.internal);

            return models.Tag.findAll({columns: ['id']});
        })
        .then((tags) => {
            module.exports.existingData.tags = tags.toJSON();

            return models.ApiKey.findAll({withRelated: 'integration'});
        })
        .then((keys) => {
            module.exports.existingData.apiKeys = keys.toJSON(context.internal);
        });
};

/**
 * 1. reset & init db
 * 2. start the server once
 *
 * @TODO: tidy up the tmp folders
 */
const startGhost = async function startGhost(options) {
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

    const contentFolderForTests = options.contentFolder;
    let parentApp;

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

    // CASE: Ghost Server is Running
    // In this case we need to reset things so it's as though Ghost just booted:
    // - truncate database
    // - re-run default fixtures
    //
    // - reload affected services
    if (ghostServer && ghostServer.httpServer && !options.forceStart) {
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
        await themes.init();

        // Reload the URL service & wait for it to be ready again
        // @TODO: Prob B: why/how is this different to urlService.resetGenerators?
        urlServiceUtils.reset();
        await urlServiceUtils.isFinished();
        // @TODO: why does this happen _after_ URL service
        web.shared.middlewares.customRedirects.reload();

        // Trigger server start, which is ONLY used for theme reload
        events.emit('server.start');

        // Expose some data, wrap-up and return
        await dirtyDataFunction();
        console.log('Restart Mode'); // eslint-disable-line no-console
        console.timeEnd('Start Ghost'); // eslint-disable-line no-console

        return ghostServer;
    }

    // CASE: Ghost Server needs Starting
    // In this case we need to ensure that Ghost is started cleanly:
    // - ensure the DB is reset
    // - CASE: If we are in force start mode the server is already running so we
    //      - stop the server (if we are in force start mode it will be running)
    //      - reload affected services - just settings and not the frontend!?
    // - Start Ghost: Uses OLD Boot process

    // Reset the DB
    await knexMigrator.reset({force: true});

    // Stop the serve (forceStart Mode)
    if (ghostServer && ghostServer.httpServer) {
        await ghostServer.stop();
    }

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
    urlService.resetGenerators();

    // Require Ghost
    ghostServer = await ghost();

    // Mount Ghost & Start Server
    if (options.subdir) {
        parentApp = express('test parent');
        parentApp.use(urlUtils.getSubdir(), ghostServer.rootApp);
        await ghostServer.start(parentApp);
    } else {
        await ghostServer.start();
    }

    // Ensure readiness was called (this is idempotent)
    GhostServer.announceServerReadiness();

    // Wait for the URL service to be ready, which happens after boot, but don't re-trigger db.ready
    await urlServiceUtils.isFinished({disableDbReadyEvent: true});

    // Expose some data, wrap-up and return
    await dirtyDataFunction();
    console.log('Fresh Start Mode'); // eslint-disable-line no-console
    console.timeEnd('Start Ghost'); // eslint-disable-line no-console
    return ghostServer;
};

module.exports = {
    startGhost: startGhost,

    stopGhost: async () => {
        if (ghostServer && ghostServer.httpServer) {
            await ghostServer.stop();
            urlService.resetGenerators();
        }
    },
    teardownDb: dbUtils.teardown,
    truncate: dbUtils.truncate,
    setup: setup,
    createUser: createUser,
    createPost: createPost,
    createEmailedPost,

    integrationTesting: oldIntegrationUtils,

    /**
     * renderObject:    res.render(view, dbResponse)
     * templateOptions: hbs.updateTemplateOptions(...)
     */
    createHbsResponse: function createHbsResponse(options) {
        const renderObject = options.renderObject || {};
        const templateOptions = options.templateOptions;
        const locals = options.locals || {};

        const hbsStructure = {
            data: {
                site: {},
                config: {},
                labs: {},
                root: {
                    _locals: {}
                }
            }
        };

        _.merge(hbsStructure.data, templateOptions);
        _.merge(hbsStructure.data.root, renderObject);
        _.merge(hbsStructure.data.root, locals);
        hbsStructure.data.root._locals = locals;

        return hbsStructure;
    },

    initFixtures: initFixtures,
    initData: dbUtils.initData,
    clearData: dbUtils.clearData,
    setupRedirectsFile: redirects.setupFile,

    fixtures: fixtureUtils.fixtures,

    DataGenerator: DataGenerator,
    filterData: filterData,
    API: APIUtils({getFixtureOps: fixtureUtils.getFixtureOps}),

    // Helpers to make it easier to write tests which are easy to read
    context: context,
    permissions: {
        owner: {user: {roles: [DataGenerator.Content.roles[3]]}},
        admin: {user: {roles: [DataGenerator.Content.roles[0]]}},
        editor: {user: {roles: [DataGenerator.Content.roles[1]]}},
        author: {user: {roles: [DataGenerator.Content.roles[2]]}},
        contributor: {user: {roles: [DataGenerator.Content.roles[4]]}}
    },
    users: {
        ids: {
            owner: DataGenerator.Content.users[0].id,
            admin: DataGenerator.Content.users[1].id,
            editor: DataGenerator.Content.users[2].id,
            author: DataGenerator.Content.users[3].id,
            admin2: DataGenerator.Content.users[6].id,
            editor2: DataGenerator.Content.users[4].id,
            author2: DataGenerator.Content.users[5].id,
            contributor: DataGenerator.Content.users[7].id,
            contributor2: DataGenerator.Content.users[8].id
        }
    },
    roles: {
        ids: {
            owner: DataGenerator.Content.roles[3].id,
            admin: DataGenerator.Content.roles[0].id,
            editor: DataGenerator.Content.roles[1].id,
            author: DataGenerator.Content.roles[2].id,
            contributor: DataGenerator.Content.roles[4].id
        }
    },
    cacheRules: cacheRules
};
