require('../../core/server/overrides');

// Utility Packages
const {sequence} = require('@tryghost/promise');
const debug = require('@tryghost/debug')('test:utils');

const _ = require('lodash');

// Ghost Internals
const models = require('../../core/server/models');

// Other Test Utilities
const e2eUtils = require('./e2e-utils');
const APIUtils = require('./api');
const dbUtils = require('./db-utils');
const fixtureUtils = require('./fixture-utils');
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
 */
const setup = function setup() {
    /*eslint no-invalid-this: "off"*/
    const self = this;

    const args = arguments;

    return function innerSetup() {
        debug('Setup start');
        models.init();
        return initFixtures
            .apply(self, args)
            .finally(() => {
                debug('Setup end');
            });
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

module.exports = {
    startGhost: e2eUtils.startGhost,
    stopGhost: e2eUtils.stopGhost,
    getExistingData: e2eUtils.getExistingData,

    teardownDb: dbUtils.teardown,
    truncate: dbUtils.truncate,
    setup: setup,
    createUser: createUser,
    createPost: createPost,
    createEmailedPost,

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
