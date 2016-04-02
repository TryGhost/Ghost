// # Fixture Utils
// Standalone file which can be required to help with advanced operations on the fixtures.json file
var _            = require('lodash'),
    Promise      = require('bluebird'),
    models       = require('../../../models'),
    sequence     = require('../../../utils/sequence'),

    fixtures     = require('./fixtures'),

// Private
    matchFunc,
    fetchRelationData,
    findRelationFixture,
    findModelFixture,

    // Public
    modelOptions = {context: {internal: true}},
    addFixturesForModel,
    addFixturesForRelation,
    findModelFixtureEntry,
    findPermissionModelForObject,
    findPermissionRelationsForObject;

/**
 * ### Match Func
 * Figures out how to match across various combinations of keys and values.
 * Match can be a string or an array containing 2 strings
 * Key and Value are the values to be found
 * Value can also be an array, in which case we look for a match in the array.
 * @api private
 * @param {String|Array} match
 * @param {String|Integer} key
 * @param {String|Array} [value]
 * @returns {Function} matching function
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
 * ### Fetch Relation Data
 * Before we build relations we need to fetch all of the models from both sides so that we can
 * use filter and find to quickly locate the correct models.
 * @api private
 * @param {{from, to, entries}} relation
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
 * ### Add Fixtures for Model
 * Takes a model fixture, with a name and some entries and processes these
 * into a sequence of promises to get each fixture added.
 *
 * @param {{name, entries}} modelFixture
 * @returns {Promise.<*>}
 */
addFixturesForModel = function addFixturesForModel(modelFixture) {
    return Promise.mapSeries(modelFixture.entries, function (entry) {
        return models[modelFixture.name].add(entry, modelOptions);
    });
};

/**
 * ## Add Fixtures for Relation
 * Takes a relation fixtures object, with a from, to and some entries and processes these
 * into a sequence of promises, to get each fixture added.
 *
 * @param {{from, to, entries}} relationFixture
 * @returns {Promise.<*>}
 */
addFixturesForRelation = function addFixturesForRelation(relationFixture) {
    return fetchRelationData(relationFixture).then(function getRelationOps(data) {
        var ops = [];

        _.each(relationFixture.entries, function processEntries(entry, key) {
            var fromItem = data.from.find(matchFunc(relationFixture.from.match, key));

            _.each(entry, function processEntryValues(value, key) {
                var toItem = data.to.filter(matchFunc(relationFixture.to.match, key, value));
                if (toItem) {
                    ops.push(function addRelationItem() {
                        return fromItem[relationFixture.from.relation]().attach(toItem);
                    });
                }
            });
        });

        return sequence(ops);
    });
};

/**
 * ### Find Model Fixture
 * Finds a model fixture based on model name
 * @api private
 * @param {String} modelName
 * @returns {Object} model fixture
 */
findModelFixture = function findModelFixture(modelName) {
    return _.find(fixtures.models, function (modelFixture) {
        return modelFixture.name === modelName;
    });
};

/**
 * ### Find Model Fixture Entry
 * Find a single model fixture entry by model name & a matching expression for the FIND function
 * @param {String} modelName
 * @param {String|Object|Function} matchExpr
 * @returns {Object} model fixture entry
 */
findModelFixtureEntry = function findModelFixtureEntry(modelName, matchExpr) {
    return _.find(findModelFixture(modelName).entries, matchExpr);
};

/**
 * ### Find All Model Fixture
 * Find a  model fixture name & a matching expression for the FILTER function
 * @param {String} modelName
 * @param {String|Object|Function} matchExpr
 * @returns {Object} model fixture
 */
findPermissionModelForObject = function findPermissionModelForObject(modelName, matchExpr) {
    var foundModel = _.cloneDeep(findModelFixture(modelName));
    foundModel.entries = _.filter(foundModel.entries, matchExpr);
    return foundModel;
};

/**
 * ### Find Relation Fixture
 * Find a relation fixture by from & to models
 * @api private
 * @param {String} from
 * @param {String} to
 * @returns {Object} relation fixture
 */
findRelationFixture = function findRelationFixture(from, to) {
    return _.find(fixtures.relations, function (relation) {
        return relation.from.model === from && relation.to.model === to;
    });
};

/**
 * ### Find Permission Relations For Object
 * Specialist function can return the permission relation fixture with only entries for a particular object.model
 * @param {String} objName
 * @returns {Object} fixture relation
 */
findPermissionRelationsForObject = function findPermissionRelationsForObject(objName) {
    // Make a copy and delete any entries we don't want
    var foundRelation = _.cloneDeep(findRelationFixture('Role', 'Permission'));

    _.each(foundRelation.entries, function (entry, role) {
        _.each(entry, function (perm, obj) {
            if (obj !== objName) {
                delete entry[obj];
            }
        });

        if (_.isEmpty(entry)) {
            delete foundRelation.entries[role];
        }
    });

    return foundRelation;
};

module.exports = {
    addFixturesForModel: addFixturesForModel,
    addFixturesForRelation: addFixturesForRelation,
    findModelFixtureEntry: findModelFixtureEntry,
    findPermissionModelForObject: findPermissionModelForObject,
    findPermissionRelationsForObject: findPermissionRelationsForObject,
    modelOptions: modelOptions
};
