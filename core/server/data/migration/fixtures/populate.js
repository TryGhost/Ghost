// # Populate Fixtures
// This module handles populating fixtures on a fresh install.
// This is done automatically, by reading the fixtures.json file
// All models, and relationships inside the file are then setup.

var Promise     = require('bluebird'),
    _           = require('lodash'),
    models      = require('../../../models'),
    utils       = require('../../../utils'),
    sequence    = require('../../../utils/sequence'),
    fixtures    = require('./fixtures'),

    // private
    addAllModels,
    addAllRelations,
    fetchRelationData,
    matchFunc,
    createOwner,
    modelOptions = {context: {internal: true}},

    // public
    populate;

/**
 * ### Add All Models
 * Sequentially calls add on all the models specified in fixtures.json
 *
 * @returns {Promise<*>}
 */
addAllModels = function addAllModels() {
    var ops = [];

    _.each(fixtures.models, function (items, modelName) {
        _.each(items, function (item) {
            ops.push(function () {
                return models[modelName].add(item, modelOptions);
            });
        });
    });

    return sequence(ops);
};

/**
 * ### Fetch Relation Data
 * Before we build relations we need to fetch all of the models from both sides so that we can
 * use filter and find to quickly locate the correct models.
 *
 * @param {Object} relation
 * @returns {Promise<*>}
 */
fetchRelationData = function fetchRelationData(relation) {
    var props = {
        from: models[relation.from.model].findAll(modelOptions),
        to: models[relation.to.model].findAll(modelOptions)
    };

    return Promise.props(props);
};

/**
 * ### Match Func
 * Figures out how to match across various combinations of keys and values.
 * Match can be a string or an array containing 2 strings
 * Key and Value are the values to be found
 * Value can also be an array, in which case we look for a match in the array.
 *
 * @param {String|Array} match
 * @param {String} key
 * @param {String|Array} [value]
 * @returns {Function}
 */
matchFunc = function matchFunc(match, key, value) {
    if (_.isArray(match)) {
        return function (item) {
            var valueTest = true;

            if (_.isArray(value)) {
                valueTest = value.indexOf(item.get(match[1])) > -1;
            } else if (value !== 'all') {
                valueTest = item.get(match[1]) === value;
            }

            return item.get(match[0]) === key && valueTest;
        };
    }

    return function (item) {
        key = key === 0 && value ? value : key;
        return item.get(match) === key;
    };
};

/**
 * ### Add All Relations
 * Sequentially calls add on all the relations specified in fixtures.json
 *
 * @returns {Promise|Array}
 */
addAllRelations = function addAllRelations() {
    return Promise.map(fixtures.relations, function (relation) {
        return fetchRelationData(relation).then(function (data) {
            var ops = [];

            _.each(relation.entries, function (entry, key) {
                var fromItem = data.from.find(matchFunc(relation.from.match, key));

                _.each(entry, function (value, key) {
                    var toItem = data.to.filter(matchFunc(relation.to.match, key, value));
                    if (toItem) {
                        ops.push(function () {
                            return fromItem[relation.from.relation]().attach(toItem);
                        });
                    }
                });
            });

            return sequence(ops);
        });
    });
};

/**
 * ### Create Owner
 * Creates the user fixture and gives it the owner role.
 * By default, users are given the Author role, making it hard to do this using the fixture system
 *
 * @param {Function} logInfo
 * @returns {Promise<*>}
 */
createOwner = function createOwner(logInfo) {
    var user = {
        name:             'Ghost Owner',
        email:            'ghost@ghost.org',
        status:           'inactive',
        password:         utils.uid(50)
    };

    return models.Role.findOne({name: 'Owner'}).then(function (ownerRole) {
        if (ownerRole) {
            user.roles = [ownerRole.id];

            logInfo('Creating owner');
            return models.User.add(user, modelOptions);
        }
    });
};

/**
 * ## Populate
 * Sequentially creates all models, in the order they are specified, and then
 * creates all the relationships, also maintaining order.
 *
 * @param {Function} logInfo
 * @returns {Promise<*>}
 */
populate = function populate(logInfo) {
    logInfo('Populating fixtures');

    // ### Ensure all models are added
    return addAllModels().then(function () {
        // ### Ensure all relations are added
        return addAllRelations();
    }).then(function () {
        return createOwner(logInfo);
    });
};

module.exports = populate;
