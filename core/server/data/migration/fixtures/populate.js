// # Populate Fixtures
// This module handles populating fixtures on a fresh install.
// This is done automatically, by reading the fixtures.json file
// All models, and relationships inside the file are then setup.
var Promise      = require('bluebird'),
    models       = require('../../../models'),
    coreUtils    = require('../../../utils'),
    fixtureUtils = require('./utils'),
    fixtures     = require('./fixtures'),

    // private
    addAllModels,
    addAllRelations,
    createOwner,

    // public
    populate;

/**
 * ### Add All Models
 * Sequentially calls add on all the models specified in fixtures.json
 *
 * @returns {Promise<*>}
 */
addAllModels = function addAllModels(modelOptions) {
    return Promise.mapSeries(fixtures.models, function (model) {
        return fixtureUtils.addFixturesForModel(model, modelOptions);
    });
};

/**
 * ### Add All Relations
 * Sequentially calls add on all the relations specified in fixtures.json
 *
 * @returns {Promise|Array}
 */
addAllRelations = function addAllRelations(modelOptions) {
    return Promise.mapSeries(fixtures.relations, function (model) {
        return fixtureUtils.addFixturesForRelation(model, modelOptions);
    });
};

/**
 * ### Create Owner
 * Creates the user fixture and gives it the owner role.
 * By default, users are given the Author role, making it hard to do this using the fixture system
 *
 * @param {{info: logger.info, warn: logger.warn}} logger
 * @returns {Promise<*>}
 */
createOwner = function createOwner(logger, modelOptions) {
    var user = {
        name:             'Ghost Owner',
        email:            'ghost@ghost.org',
        status:           'inactive',
        password:         coreUtils.uid(50)
    };

    return models.Role.findOne({name: 'Owner'}, modelOptions).then(function (ownerRole) {
        if (ownerRole) {
            user.roles = [ownerRole.id];

            logger.info('Creating owner');
            return models.User.add(user, modelOptions);
        }
    });
};

/**
 * ## Populate
 * Sequentially creates all models, in the order they are specified, and then
 * creates all the relationships, also maintaining order.
 *
 * @param {{info: logger.info, warn: logger.warn}} logger
 * @returns {Promise<*>}
 */
populate = function populate(logger, modelOptions) {
    logger.info('Running fixture populations');

    return addAllModels(modelOptions)
        .then(function () {
            return addAllRelations(modelOptions);
        })
        .then(function () {
            return createOwner(logger, modelOptions);
        });
};

module.exports = populate;
