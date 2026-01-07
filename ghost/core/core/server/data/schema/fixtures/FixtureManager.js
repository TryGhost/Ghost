const _ = require('lodash');
const logging = require('@tryghost/logging');
const {sequence} = require('@tryghost/promise');

const models = require('../../../models');
const baseUtils = require('../../../models/base/utils');

const moment = require('moment');

class FixtureManager {
    /**
     * Create a new FixtureManager instance
     *
     * @param {Object} fixtures - The fixture data
     * @param {Object<string, Function>} placeholderMap - Map of placeholder
     * strings to replacement functions that will be called with the models
     * object. The replacement function will be called with the models object
     * and should return the replacement value. The replacement function will
     * only be called once and its value will be cached for subsequent calls.
     * The placeholder string will be replaced with the replacement value in
     * the fixtures.
     * @example
     * new FixtureManager(fixtures, {
     *     __OWNER_USER_ID__: (models) => models.User.generateId()
     * })
     */
    constructor(fixtures, placeholderMap = {}) {
        this._fixtures = fixtures;
        this.placeholderMap = placeholderMap;
        this.hasProcessedFixtures = false;
    }

    /**
     * Lazily get the fixtures, processing placeholders on first access
     * @returns {Object}
     */
    get fixtures() {
        if (!this.hasProcessedFixtures) {
            this._fixtures = this.processFixtures(this._fixtures, this.placeholderMap);
            this.hasProcessedFixtures = true;
        }

        return this._fixtures;
    }

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
    static matchFunc(match, key, value) {
        if (_.isArray(match)) {
            return function (item) {
                let valueTest = true;

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
    }

    static matchObj(match, item) {
        const matchedObj = {};

        if (_.isArray(match)) {
            _.each(match, (matchProp) => {
                matchedObj[matchProp] = item.get(matchProp);
            });
        } else {
            matchedObj[match] = item.get(match);
        }

        return matchedObj;
    }

    /**
     * Add All Fixtures
     *
     * Helper method to handle adding all fixtures
     *
     * @param {object} options
     * @returns
     */
    async addAllFixtures(options) {
        const ownerUserId = this.findOwnerUserId();

        const localOptions = _.merge({
            autoRefresh: false,
            context: {
                internal: true,
                // Ensure the owner user is set in the context when creating
                // the fixtures so that attribution gets correctly set (i.e
                // the owner user is set as the `published_by` user on posts)
                user: ownerUserId
            },
            migrating: true
        }, options);

        const roleModel = this.fixtures.models.find(m => m.name === 'Role');
        await this.addFixturesForModel(roleModel, localOptions);

        const userModel = this.fixtures.models.find(m => m.name === 'User');
        await this.addFixturesForModel(userModel, localOptions);

        const userRolesRelation = this.fixtures.relations.find(r => r.from.relation === 'roles');
        await this.addFixturesForRelation(userRolesRelation, localOptions);

        await sequence(this.fixtures.models.filter(m => !['User', 'Role'].includes(m.name)).map(model => () => {
            logging.info('Model: ' + model.name);
            return this.addFixturesForModel(model, localOptions);
        }));

        await sequence(this.fixtures.relations.filter(r => r.from.relation !== 'roles').map(relation => () => {
            logging.info('Relation: ' + relation.from.model + ' to ' + relation.to.model);
            return this.addFixturesForRelation(relation, localOptions);
        }));
    }

    /*
     * Find methods - use the local fixtures
     */

    /**
     * ### Find Model Fixture
     * Finds a model fixture based on model name
     * @api private
     * @param {String} modelName
     * @returns {Object} model fixture
     */
    findModelFixture(modelName) {
        return _.find(this.fixtures.models, (modelFixture) => {
            return modelFixture.name === modelName;
        });
    }

    /**
     * ### Find Model Fixture Entry
     * Find a single model fixture entry by model name & a matching expression for the FIND function
     * @param {String} modelName
     * @param {String|Object|Function} matchExpr
     * @returns {Object} model fixture entry
     */
    findModelFixtureEntry(modelName, matchExpr) {
        return _.find(this.findModelFixture(modelName).entries, matchExpr);
    }

    /**
     * ### Find Model Fixtures
     * Find a  model fixture name & a matching expression for the FILTER function
     * @param {String} modelName
     * @param {String|Object|Function} matchExpr
     * @returns {Object} model fixture
     */
    findModelFixtures(modelName, matchExpr) {
        const foundModel = _.cloneDeep(this.findModelFixture(modelName));
        foundModel.entries = _.filter(foundModel.entries, matchExpr);
        return foundModel;
    }

    /**
     * ### Find Relation Fixture
     * Find a relation fixture by from & to models
     * @api private
     * @param {String} from
     * @param {String} to
     * @returns {Object} relation fixture
     */
    findRelationFixture(from, to) {
        return _.find(this.fixtures.relations, (relation) => {
            return relation.from.model === from && relation.to.model === to;
        });
    }

    /**
     * ### Find Permission Relations For Object
     * Specialist function can return the permission relation fixture with only entries for a particular object.model
     * @param {String} objName
     * @returns {Object} fixture relation
     */
    findPermissionRelationsForObject(objName, role) {
        // Make a copy and delete any entries we don't want
        const foundRelation = _.cloneDeep(this.findRelationFixture('Role', 'Permission'));

        _.each(foundRelation.entries, (entry, key) => {
            _.each(entry, (perm, obj) => {
                if (obj !== objName) {
                    delete entry[obj];
                }
            });

            if (_.isEmpty(entry) || (role && role !== key)) {
                delete foundRelation.entries[key];
            }
        });

        return foundRelation;
    }

    /**
     * ### Find Owner User ID
     * Find the owner user ID from the relation fixture
     * @returns {string}
     */
    findOwnerUserId() {
        const relation = this.findRelationFixture('User', 'Role');

        return Object.keys(relation.entries).find(
            key => relation.entries[key].includes('Owner')
        );
    }

    /******************************************************
     * From here down, the methods require access to models
     ******************************************************/

    /**
     * Process fixtures by replacing placeholder strings with dynamic values
     *
     * @param {Object} fixtures - The fixture data to process
     * @param {Object<string, Function>} placeholderMap - Map of placeholder
     * strings to replacement functions that will be called with the models
     * object. The replacement function will be called with the models object
     * and should return the replacement value. The replacement function will
     * only be called once and its value will be cached for subsequent calls.
     * The placeholder string will be replaced with the replacement value in
     * the fixtures.
     * @returns {Object}
     */
    processFixtures(fixtures, placeholderMap) {
        const cache = new Map();

        const processString = (str, replacements) => {
            let result = str;

            for (const placeholder in replacements) {
                if (result.includes(placeholder)) {
                    if (!cache.has(placeholder)) {
                        cache.set(placeholder, replacements[placeholder](models));
                    }

                    const processedValue = cache.get(placeholder);

                    result = result.replaceAll(placeholder, processedValue);
                }
            }

            return result;
        };

        const replacePlaceholders = (obj, replacements) => {
            if (obj === null || obj === undefined) {
                return obj;
            }

            if (typeof obj === 'string') {
                return processString(obj, replacements);
            }

            if (Array.isArray(obj)) {
                return obj.map(item => replacePlaceholders(item, replacements));
            }

            if (typeof obj === 'object') {
                const result = {};

                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        // Process the key itself for placeholders
                        const newKey = processString(key, replacements);

                        result[newKey] = replacePlaceholders(obj[key], replacements);
                    }
                }

                return result;
            }

            return obj;
        };

        return replacePlaceholders(fixtures, placeholderMap);
    }

    /******************************************************
     * From here down, the methods aren't dependent on
     * this.fixtures
     ******************************************************/

    /**
     * ### Fetch Relation Data
     * Before we build relations we need to fetch all of the models from both sides so that we can
     * use filter and find to quickly locate the correct models.
     * @api private
     * @param {{from, to, entries}} relation
     * @returns {Promise<*>}
     */
    fetchRelationData(relation, options) {
        const fromOptions = _.extend({}, options, {withRelated: [relation.from.relation]});

        const fromRelations = models[relation.from.model].findAll(fromOptions);
        const toRelations = models[relation.to.model].findAll(options);

        return Promise.all([fromRelations, toRelations]).then(([from, to]) => {
            return {
                from: from,
                to: to
            };
        });
    }

    /**
     * ### Add Fixtures for Model
     * Takes a model fixture, with a name and some entries and processes these
     * into a sequence of promises to get each fixture added.
     *
     * @param {{name, entries}} modelFixture
     * @returns {Promise<any>}
     */
    async addFixturesForModel(modelFixture, options = {}) {
        // Clone the fixtures as they get changed in this function.
        // The initial blog posts will be added a `published_at` property, which
        // would change the fixturesHash.
        modelFixture = _.cloneDeep(modelFixture);
        // The Post model fixtures need a `published_at` date, where at least the seconds
        // are different, otherwise `prev_post` and `next_post` helpers won't work with
        // them.
        if (modelFixture.name === 'Post') {
            _.forEach(modelFixture.entries, (post, index) => {
                if (!post.published_at) {
                    post.published_at = moment().add(index, 'seconds');
                }
            });
        }

        const results = await sequence(modelFixture.entries.map(entry => async () => {
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

            const found = await models[modelFixture.name].findOne(data, options);
            if (!found) {
                return models[modelFixture.name].add(entry, options);
            }
        }));

        return {expected: modelFixture.entries.length, done: _.compact(results).length};
    }

    /**
     * ## Add Fixtures for Relation
     * Takes a relation fixtures object, with a from, to and some entries and processes these
     * into a sequence of promises, to get each fixture added.
     *
     * @param {{from, to, entries}} relationFixture
     * @returns {Promise<any>}
     */
    async addFixturesForRelation(relationFixture, options) {
        const ops = [];
        let max = 0;

        const data = await this.fetchRelationData(relationFixture, options);

        _.each(relationFixture.entries, (entry, key) => {
            const fromItem = data.from.find(FixtureManager.matchFunc(relationFixture.from.match, key));

            // CASE: You add new fixtures e.g. a new role in a new release.
            // As soon as an **older** migration script wants to add permissions for any resource, it iterates over the
            // permissions for each role. But if the role does not exist yet, it won't find the matching db entry and breaks.
            if (!fromItem) {
                logging.warn('Skip: Target database entry not found for key: ' + key);
                return Promise.resolve();
            }

            _.each(entry, (value, entryKey) => {
                let toItems = data.to.filter(FixtureManager.matchFunc(relationFixture.to.match, entryKey, value));
                max += toItems.length;

                // Remove any duplicates that already exist in the collection
                toItems = _.reject(toItems, (item) => {
                    return fromItem
                        .related(relationFixture.from.relation)
                        .find((model) => {
                            const objectToMatch = FixtureManager.matchObj(relationFixture.to.match, item);
                            return Object.keys(objectToMatch).every((keyToCheck) => {
                                return model.get(keyToCheck) === objectToMatch[keyToCheck];
                            });
                        });
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

        const result = await sequence(ops);
        return {expected: max, done: _(result).map('length').sum()};
    }

    async removeFixturesForModel(modelFixture, options) {
        const results = await sequence(modelFixture.entries.map(entry => async () => {
            const found = models[modelFixture.name].findOne(entry.id ? {id: entry.id} : entry, options);
            if (found) {
                return models[modelFixture.name].destroy(_.extend(options, {id: found.id}));
            }
        }));

        return {expected: modelFixture.entries.length, done: results.length};
    }

    async removeFixturesForRelation(relationFixture, options) {
        const data = await this.fetchRelationData(relationFixture, options);
        const ops = [];

        _.each(relationFixture.entries, (entry, key) => {
            const fromItem = data.from.find(FixtureManager.matchFunc(relationFixture.from.match, key));

            _.each(entry, (value, entryKey) => {
                const toItems = data.to.filter(FixtureManager.matchFunc(relationFixture.to.match, entryKey, value));

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

        return await sequence(ops);
    }
}

module.exports = FixtureManager;
