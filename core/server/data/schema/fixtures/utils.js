// # Fixture Utils
// Standalone file which can be required to help with advanced operations on the fixtures.json file
var _ = require('lodash'),
    Promise = require('bluebird'),
    common = require('../../../lib/common'),
    models = require('../../../models'),
    baseUtils = require('../../../models/base/utils'),
    sequence = require('../../../lib/promise/sequence'),
    moment = require('moment'),

    fixtures = require('./fixtures'),

    // Private
    matchFunc,
    matchObj,
    fetchRelationData,
    findRelationFixture,
    findModelFixture,

    addFixturesForModel,
    addFixturesForRelation,
    removeFixturesForModel,
    removeFixturesForRelation,

    findModelFixtureEntry,
    findModelFixtures,
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

matchObj = function matchObj(match, item) {
    var matchObj = {};

    if (_.isArray(match)) {
        _.each(match, function (matchProp) {
            matchObj[matchProp] = item.get(matchProp);
        });
    } else {
        matchObj[match] = item.get(match);
    }

    return matchObj;
};

/**
 * ### Fetch Relation Data
 * Before we build relations we need to fetch all of the models from both sides so that we can
 * use filter and find to quickly locate the correct models.
 * @api private
 * @param {{from, to, entries}} relation
 * @returns {Promise<*>}
 */
fetchRelationData = function fetchRelationData(relation, options) {
    var fromOptions = _.extend({}, options, {withRelated: [relation.from.relation]}),
        props = {
            from: models[relation.from.model].findAll(fromOptions),
            to: models[relation.to.model].findAll(options)
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
addFixturesForModel = function addFixturesForModel(modelFixture, options = {}) {
    // Clone the fixtures as they get changed in this function.
    // The initial blog posts will be added a `published_at` property, which
    // would change the fixturesHash.
    modelFixture = _.cloneDeep(modelFixture);
    // The Post model fixtures need a `published_at` date, where at least the seconds
    // are different, otherwise `prev_post` and `next_post` helpers won't workd with
    // them.
    if (modelFixture.name === 'Post') {
        _.forEach(modelFixture.entries, function (post, index) {
            if (!post.published_at) {
                post.published_at = moment().add(index, 'seconds');
            }
        });
    }

    return Promise.mapSeries(modelFixture.entries, function (entry) {
        let data = {};

        // CASE: if id is specified, only query by id
        if (entry.id) {
            data.id = entry.id;
        } else if (entry.slug) {
            data.slug = entry.slug;
        } else {
            data = _.cloneDeep(entry);
        }

        if (modelFixture.name === 'Post') {
            data.status = 'all';
        }

        return models[modelFixture.name].findOne(data, options).then(function (found) {
            if (!found) {
                return models[modelFixture.name].add(entry, options);
            }
        });
    }).then(function (results) {
        return {expected: modelFixture.entries.length, done: _.compact(results).length};
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
addFixturesForRelation = function addFixturesForRelation(relationFixture, options) {
    var ops = [], max = 0;

    return fetchRelationData(relationFixture, options).then(function getRelationOps(data) {
        _.each(relationFixture.entries, function processEntries(entry, key) {
            var fromItem = data.from.find(matchFunc(relationFixture.from.match, key));

            // CASE: You add new fixtures e.g. a new role in a new release.
            // As soon as an **older** migration script wants to add permissions for any resource, it iterates over the
            // permissions for each role. But if the role does not exist yet, it won't find the matching db entry and breaks.
            if (!fromItem) {
                common.logging.warn('Skip: Target database entry not found for key: ' + key);
                return Promise.resolve();
            }

            _.each(entry, function processEntryValues(value, key) {
                var toItems = data.to.filter(matchFunc(relationFixture.to.match, key, value));
                max += toItems.length;

                // Remove any duplicates that already exist in the collection
                toItems = _.reject(toItems, function (item) {
                    return fromItem
                        .related(relationFixture.from.relation)
                        .findWhere(matchObj(relationFixture.to.match, item));
                });

                if (toItems && toItems.length > 0) {
                    ops.push(function addRelationItems() {
                        return baseUtils.attach(
                            models[relationFixture.from.Model || relationFixture.from.model],
                            fromItem.id,
                            relationFixture.from.relation,
                            toItems,
                            options
                        );
                    });
                }
            });
        });

        return sequence(ops);
    }).then(function (result) {
        return {expected: max, done: _(result).map('length').sum()};
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
 * ### Find Model Fixtures
 * Find a  model fixture name & a matching expression for the FILTER function
 * @param {String} modelName
 * @param {String|Object|Function} matchExpr
 * @returns {Object} model fixture
 */
findModelFixtures = function findModelFixtures(modelName, matchExpr) {
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
findPermissionRelationsForObject = function findPermissionRelationsForObject(objName, role) {
    // Make a copy and delete any entries we don't want
    var foundRelation = _.cloneDeep(findRelationFixture('Role', 'Permission'));

    _.each(foundRelation.entries, function (entry, key) {
        _.each(entry, function (perm, obj) {
            if (obj !== objName) {
                delete entry[obj];
            }
        });

        if (_.isEmpty(entry) || (role && role !== key)) {
            delete foundRelation.entries[key];
        }
    });

    return foundRelation;
};

removeFixturesForModel = function removeFixturesForModel(modelFixture, options) {
    return Promise.mapSeries(modelFixture.entries, function (entry) {
        return models[modelFixture.name].findOne(entry.id ? {id: entry.id} : entry, options).then(function (found) {
            if (found) {
                return models[modelFixture.name].destroy(_.extend(options, {id: found.id}));
            }
        });
    }).then(function (results) {
        return {expected: modelFixture.entries.length, done: results.length};
    });
};

removeFixturesForRelation = function removeFixturesForRelation(relationFixture, options) {
    return fetchRelationData(relationFixture, options).then(function getRelationOps(data) {
        const ops = [];

        _.each(relationFixture.entries, function processEntries(entry, key) {
            const fromItem = data.from.find(matchFunc(relationFixture.from.match, key));

            _.each(entry, function processEntryValues(value, key) {
                const toItems = data.to.filter(matchFunc(relationFixture.to.match, key, value));

                if (toItems && toItems.length > 0) {
                    ops.push(function detachRelation() {
                        return baseUtils.detach(
                            models[relationFixture.from.Model || relationFixture.from.model],
                            fromItem.id,
                            relationFixture.from.relation,
                            toItems,
                            options
                        );
                    });
                }
            });
        });

        return sequence(ops);
    });
};

module.exports = {
    addFixturesForModel: addFixturesForModel,
    addFixturesForRelation: addFixturesForRelation,
    findModelFixtureEntry: findModelFixtureEntry,
    findModelFixtures: findModelFixtures,
    findRelationFixture: findRelationFixture,
    findPermissionRelationsForObject: findPermissionRelationsForObject,
    removeFixturesForModel: removeFixturesForModel,
    removeFixturesForRelation: removeFixturesForRelation
};
