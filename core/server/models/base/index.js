// # Base Model
// This is the model from which all other Ghost models extend. The model is based on Bookshelf.Model, and provides
// several basic behaviours such as UUIDs, as well as a set of Data methods for accessing information from the database.
//
// The models are internal to Ghost, only the API and some internal functions such as migration and import/export
// accesses the models directly.

// All other parts of Ghost, including the frontend & admin UI are only allowed to access data via the API.
const _ = require('lodash');

const moment = require('moment');
const ObjectId = require('bson-objectid');
const errors = require('@tryghost/errors');
const security = require('@tryghost/security');
const schema = require('../../data/schema');
const urlUtils = require('../../../shared/url-utils');
const bulkOperations = require('./bulk-operations');
const tpl = require('@tryghost/tpl');

const ghostBookshelf = require('./bookshelf');

const messages = {
    missingContext: 'missing context',
    invalidDate: 'Date format for `{key}` is invalid.'
};

let proto;

// Cache an instance of the base model prototype
proto = ghostBookshelf.Model.prototype;

// ## ghostBookshelf.Model
// The Base Model which other Ghost objects will inherit from,
// including some convenience functions as static properties on the model.
ghostBookshelf.Model = ghostBookshelf.Model.extend({
    // Bookshelf `hasTimestamps` - handles created_at and updated_at properties
    hasTimestamps: true,

    // https://github.com/bookshelf/bookshelf/commit/a55db61feb8ad5911adb4f8c3b3d2a97a45bd6db
    parsedIdAttribute: function () {
        return false;
    },

    // Ghost option handling - get permitted attributes from server/data/schema.js, where the DB schema is defined
    permittedAttributes: function permittedAttributes() {
        return _.keys(schema.tables[this.tableName])
            .filter(key => key.indexOf('@@') === -1);
    },

    // Ghost ordering handling, allows to order by permitted attributes by default and can be overriden on specific model level
    orderAttributes: function orderAttributes() {
        return Object.keys(schema.tables[this.tableName])
            .map(key => `${this.tableName}.${key}`)
            .filter(key => key.indexOf('@@') === -1);
    },

    // When loading an instance, subclasses can specify default to fetch
    defaultColumnsToFetch: function defaultColumnsToFetch() {
        return [];
    },

    // Bookshelf `initialize` - declare a constructor-like method for model creation
    initialize: function initialize() {
        this.initializeEvents();

        // @NOTE: Please keep here. If we don't initialize the parent, bookshelf-relations won't work.
        proto.initialize.call(this);
    },

    /**
     * Bookshelf's .format() is run when fetching as well as saving.
     * We need a way to transform attributes only on save so we override
     * .sync() which is run on every database operation where we can
     * run any transforms needed only on insert and update operations
     */
    sync: function sync() {
        const parentSync = proto.sync.apply(this, arguments);
        const originalUpdateSync = parentSync.update;
        const originalInsertSync = parentSync.insert;
        const self = this;

        // deep clone attrs to avoid modifying underlying model attributes by reference
        parentSync.update = function update(attrs) {
            attrs = self.formatOnWrite(_.cloneDeep(attrs));
            return originalUpdateSync.apply(this, [attrs]);
        };

        parentSync.insert = function insert(attrs) {
            attrs = self.formatOnWrite(_.cloneDeep(attrs));
            return originalInsertSync.apply(this, [attrs]);
        };

        return parentSync;
    },

    /**
     * before we insert dates into the database, we have to normalize
     * date format is now in each db the same
     */
    fixDatesWhenSave: function fixDates(attrs) {
        const self = this;

        _.each(attrs, function each(value, key) {
            if (value !== null
                && Object.prototype.hasOwnProperty.call(schema.tables[self.tableName], key)
                && schema.tables[self.tableName][key].type === 'dateTime') {
                attrs[key] = moment(value).format('YYYY-MM-DD HH:mm:ss');
            }
        });

        return attrs;
    },

    /**
     * all supported databases (sqlite, mysql) return different values
     *
     * sqlite:
     *   - knex returns a UTC String (2018-04-12 20:50:35)
     * mysql:
     *   - knex wraps the UTC value into a local JS Date
     */
    fixDatesWhenFetch: function fixDates(attrs) {
        const self = this;
        let dateMoment;

        _.each(attrs, function each(value, key) {
            if (value !== null
                && Object.prototype.hasOwnProperty.call(schema.tables[self.tableName], key)
                && schema.tables[self.tableName][key].type === 'dateTime') {
                dateMoment = moment(value);

                // CASE: You are somehow able to store e.g. 0000-00-00 00:00:00
                // Protect the code base and return the current date time.
                if (dateMoment.isValid()) {
                    attrs[key] = dateMoment.startOf('seconds').toDate();
                } else {
                    attrs[key] = moment().startOf('seconds').toDate();
                }
            }
        });

        return attrs;
    },

    // Convert integers to real booleans
    fixBools: function fixBools(attrs) {
        const self = this;
        _.each(attrs, function each(value, key) {
            if (Object.prototype.hasOwnProperty.call(schema.tables[self.tableName], key)
                && schema.tables[self.tableName][key].type === 'bool') {
                attrs[key] = value ? true : false;
            }
        });

        return attrs;
    },

    getNullableStringProperties() {
        const table = schema.tables[this.tableName];
        return Object.keys(table).filter(column => table[column].nullable);
    },

    setEmptyValuesToNull: function setEmptyValuesToNull() {
        const nullableStringProps = this.getNullableStringProperties();
        return nullableStringProps.forEach((prop) => {
            if (this.get(prop) === '') {
                this.set(prop, null);
            }
        });
    },

    getActor(options = {context: {}}) {
        if (options.context && options.context.integration) {
            return {
                id: options.context.integration.id,
                type: 'integration'
            };
        }

        if (options.context && options.context.user) {
            return {
                id: options.context.user,
                type: 'user'
            };
        }

        return null;
    },

    // Get the user from the options object
    contextUser: function contextUser(options) {
        options = options || {};
        options.context = options.context || {};

        if (options.context.user || ghostBookshelf.Model.isExternalUser(options.context.user)) {
            return options.context.user;
        } else if (options.context.integration) {
            /**
             * @NOTE:
             *
             * This is a dirty hotfix for v0.1 only.
             * The `x_by` columns are getting deprecated soon (https://github.com/TryGhost/Ghost/issues/10286).
             *
             * We return the owner ID '1' in case an integration updates or creates
             * resources. v0.1 will continue to use the `x_by` columns. v0.1 does not support integrations.
             * API v2 will introduce a new feature to solve inserting/updating resources
             * from users or integrations. API v2 won't expose `x_by` columns anymore.
             *
             * ---
             *
             * Why using ID '1'? WAIT. What???????
             *
             * See https://github.com/TryGhost/Ghost/issues/9299.
             *
             * We currently don't read the correct owner ID from the database and assume it's '1'.
             * This is a leftover from switching from auto increment ID's to Object ID's.
             * But this takes too long to refactor out now. If an internal update happens, we also
             * use ID '1'. This logic exists for a LONG while now. The owner ID only changes from '1' to something else,
             * if you transfer ownership.
             */
            return ghostBookshelf.Model.internalUser;
        } else if (options.context.internal) {
            return ghostBookshelf.Model.internalUser;
        } else if (this.get('id')) {
            return this.get('id');
        } else if (options.context.external) {
            return ghostBookshelf.Model.externalUser;
        } else {
            throw new errors.NotFoundError({
                message: tpl(messages.missingContext),
                level: 'critical'
            });
        }
    },

    // format date before writing to DB, bools work
    format: function format(attrs) {
        return this.fixDatesWhenSave(attrs);
    },

    // overridable function for models to format attrs only when saving to db
    formatOnWrite: function formatOnWrite(attrs) {
        return attrs;
    },

    // format data and bool when fetching from DB
    parse: function parse(attrs) {
        return this.fixBools(this.fixDatesWhenFetch(attrs));
    },

    /**
     * `shallow`    - won't return relations
     * `omitPivot`  - won't return pivot fields
     *
     * `toJSON` calls `serialize`.
     *
     * @param unfilteredOptions
     * @returns {*}
     */
    toJSON: function toJSON(unfilteredOptions) {
        const options = ghostBookshelf.Model.filterOptions(unfilteredOptions, 'toJSON');
        options.omitPivot = true;

        /**
         * removes null relations coming from `hasOne` - https://bookshelfjs.org/api.html#Model-instance-hasOne
         * Based on https://github.com/bookshelf/bookshelf/issues/72#issuecomment-25164617
         */
        _.each(this.relations, (value, key) => {
            if (_.isEmpty(value)) {
                delete this.relations[key];
            }
        });
        // CASE: get JSON of previous attrs
        if (options.previous) {
            const clonedModel = _.cloneDeep(this);
            clonedModel.attributes = this._previousAttributes;

            if (this.relationships) {
                this.relationships.forEach((relation) => {
                    if (this._previousRelations && Object.prototype.hasOwnProperty.call(this._previousRelations, relation)) {
                        clonedModel.related(relation).models = this._previousRelations[relation].models;
                    }
                });
            }

            return proto.toJSON.call(clonedModel, options);
        }

        return proto.toJSON.call(this, options);
    },

    hasDateChanged: function (attr) {
        return moment(this.get(attr)).diff(moment(this.previous(attr))) !== 0;
    },

    /**
     * we auto generate a GUID for each resource
     * no auto increment
     */
    setId: function setId() {
        this.set('id', ObjectId().toHexString());
    },

    wasChanged() {
        /**
         * @NOTE:
         * Not every model & interaction is currently set up to handle "._changed".
         * e.g. we trigger a manual event for "tag.attached", where as "._changed" is undefined.
         *
         * Keep "true" till we are sure that "._changed" is always a thing.
         */
        if (!this._changed) {
            return true;
        }

        if (!Object.keys(this._changed).length) {
            return false;
        }

        return true;
    }
}, {
    // ## Data Utility Functions

    /**
     * please use these static definitions when comparing id's
     * we keep type Number, because we have too many check's where we rely on Number
     * context.user ? true : false (if context.user is 0 as number, this condition is false)
     */
    internalUser: 1,
    externalUser: 0,

    isInternalUser: function isInternalUser(id) {
        return id === ghostBookshelf.Model.internalUser || id === ghostBookshelf.Model.internalUser.toString();
    },

    isExternalUser: function isExternalUser(id) {
        return id === ghostBookshelf.Model.externalUser || id === ghostBookshelf.Model.externalUser.toString();
    },

    /**
     * Returns an array of keys permitted in every method's `options` hash.
     * Can be overridden and added to by a model's `permittedOptions` method.
     *
     * importing: is used when import a JSON file or when migrating the database
     *
     * @return {Object} Keys allowed in the `options` hash of every model's method.
     */
    permittedOptions: function permittedOptions(methodName) {
        const baseOptions = ['context', 'withRelated'];
        const extraOptions = ['transacting', 'importing', 'forUpdate', 'migrating'];

        switch (methodName) {
        case 'toJSON':
            return baseOptions.concat('shallow', 'columns', 'previous');
        case 'destroy':
            return baseOptions.concat(extraOptions, ['id', 'destroyBy', 'require']);
        case 'edit':
            return baseOptions.concat(extraOptions, ['id', 'require']);
        case 'findOne':
            return baseOptions.concat(extraOptions, ['columns', 'require', 'mongoTransformer']);
        case 'findAll':
            return baseOptions.concat(extraOptions, ['filter', 'columns', 'mongoTransformer']);
        case 'findPage':
            return baseOptions.concat(extraOptions, ['filter', 'order', 'autoOrder', 'page', 'limit', 'columns', 'mongoTransformer']);
        default:
            return baseOptions.concat(extraOptions);
        }
    },

    /**
     * Filters potentially unsafe model attributes, so you can pass them to Bookshelf / Knex.
     * This filter should be called before each insert/update operation.
     *
     * @param {Object} data Has keys representing the model's attributes/fields in the database.
     * @return {Object} The filtered results of the passed in data, containing only what's allowed in the schema.
     */
    filterData: function filterData(data) {
        const permittedAttributes = this.prototype.permittedAttributes();
        const filteredData = _.pick(data, permittedAttributes);
        const sanitizedData = this.sanitizeData(filteredData);

        return sanitizedData;
    },

    /**
     * `sanitizeData` ensures that client data is in the correct format for further operations.
     *
     * Dates:
     * - client dates are sent as ISO 8601 format (moment(..).format())
     * - server dates are in JS Date format
     *   >> when bookshelf fetches data from the database, all dates are in JS Dates
     *   >> see `parse`
     * - Bookshelf updates the model with the new client data via the `set` function
     * - Bookshelf uses a simple `isEqual` function from lodash to detect real changes
     * - .previous(attr) and .get(attr) returns false obviously
     * - internally we use our `hasDateChanged` if we have to compare previous dates
     * - but Bookshelf is not in our control for this case
     *
     * @IMPORTANT
     * Before the new client data get's inserted again, the dates get's re-transformed into
     * proper strings, see `format`.
     *
     * @IMPORTANT
     * Sanitize relations.
     */
    sanitizeData: function sanitizeData(data) {
        const tableName = _.result(this.prototype, 'tableName');
        let date;

        _.each(data, (value, property) => {
            if (value !== null
                && Object.prototype.hasOwnProperty.call(schema.tables[tableName], property)
                && schema.tables[tableName][property].type === 'dateTime'
                && typeof value === 'string'
            ) {
                date = new Date(value);

                // CASE: client sends `0000-00-00 00:00:00`
                if (isNaN(date)) {
                    throw new errors.ValidationError({
                        message: tpl(messages.invalidDate, {key: property}),
                        code: 'DATE_INVALID'
                    });
                }

                data[property] = moment(value).toDate();
            }

            if (this.prototype.relationships && this.prototype.relationships.indexOf(property) !== -1) {
                let relations = data[property];

                // CASE: 1:1 relation will have single data point
                if (!_.isArray(data[property])) {
                    relations = [data[property]];
                }
                _.each(relations, (relation, indexInArr) => {
                    _.each(relation, (relationValue, relationProperty) => {
                        if (relationValue !== null
                            && Object.prototype.hasOwnProperty.call(schema.tables[this.prototype.relationshipBelongsTo[property]], relationProperty)
                            && schema.tables[this.prototype.relationshipBelongsTo[property]][relationProperty].type === 'dateTime'
                            && typeof relationValue === 'string'
                        ) {
                            date = new Date(relationValue);

                            // CASE: client sends `0000-00-00 00:00:00`
                            if (isNaN(date)) {
                                throw new errors.ValidationError({
                                    message: tpl(messages.invalidDate, {key: relationProperty}),
                                    code: 'DATE_INVALID'
                                });
                            }

                            data[property][indexInArr][relationProperty] = moment(relationValue).toDate();
                        }
                    });
                });
            }
        });

        return data;
    },

    /**
     * Filters potentially unsafe `options` in a model method's arguments, so you can pass them to Bookshelf / Knex.
     * @param {Object} unfilteredOptions Represents options to filter in order to be passed to the Bookshelf query.
     * @param {String} methodName The name of the method to check valid options for.
     * @return {Object} The filtered results of `options`.
     */
    filterOptions: function filterOptions(unfilteredOptions, methodName, filterConfig) {
        unfilteredOptions = unfilteredOptions || {};
        filterConfig = filterConfig || {};

        if (Object.prototype.hasOwnProperty.call(unfilteredOptions, 'include')) {
            throw new errors.IncorrectUsageError({
                message: 'The model layer expects using `withRelated`.'
            });
        }

        let options = _.cloneDeep(unfilteredOptions);
        const extraAllowedProperties = filterConfig.extraAllowedProperties || [];
        let permittedOptions;

        permittedOptions = this.permittedOptions(methodName, options);
        permittedOptions = _.union(permittedOptions, extraAllowedProperties);
        options = _.pick(options, permittedOptions);

        if (this.defaultRelations) {
            options = this.defaultRelations(methodName, options);
        }

        return options;
    },

    // ## Model Data Functions

    getFilteredCollection: function getFilteredCollection(options) {
        const filteredCollection = this.forge();

        // Apply model-specific query behaviour
        filteredCollection.applyCustomQuery(options);

        // Add Filter behaviour
        filteredCollection.applyDefaultAndCustomFilters(options);

        // Apply model-specific search behaviour
        filteredCollection.applySearchQuery(options);

        return filteredCollection;
    },

    getFilteredCollectionQuery: function getFilteredCollectionQuery(options) {
        const filteredCollection = this.getFilteredCollection(options);
        const filteredCollectionQuery = filteredCollection.query();

        if (options.transacting) {
            filteredCollectionQuery.transacting(options.transacting);
            if (options.forUpdate) {
                filteredCollectionQuery.forUpdate();
            }
        }

        return filteredCollectionQuery;
    },

    bulkAdd: function bulkAdd(data, tableName) {
        tableName = tableName || this.prototype.tableName;

        return bulkOperations.insert(tableName, data);
    },

    bulkDestroy: function bulkDestroy(data, tableName) {
        tableName = tableName || this.prototype.tableName;

        return bulkOperations.del(tableName, data);
    },

    /**
     * ### Generate Slug
     * Create a string to act as the permalink for an object.
     * @param {ghostBookshelf.Model} Model Model type to generate a slug for
     * @param {String} base The string for which to generate a slug, usually a title or name
     * @param {Object} options Options to pass to findOne
     * @return {Promise<String>} Resolves to a unique slug string
     */
    generateSlug: function generateSlug(Model, base, options) {
        let slug;
        let slugTryCount = 1;
        const baseName = Model.prototype.tableName.replace(/s$/, '');

        let longSlug;

        // Look for a matching slug, append an incrementing number if so
        const checkIfSlugExists = function checkIfSlugExists(slugToFind) {
            const args = {slug: slugToFind};

            // status is needed for posts
            if (options && options.status) {
                args.status = options.status;
            }

            return Model.findOne(args, options).then(function then(found) {
                let trimSpace;

                if (!found) {
                    return slugToFind;
                }

                slugTryCount += 1;

                // If we shortened, go back to the full version and try again
                if (slugTryCount === 2 && longSlug) {
                    slugToFind = longSlug;
                    longSlug = null;
                    slugTryCount = 1;
                    return checkIfSlugExists(slugToFind);
                }

                // If this is the first time through, add the hyphen
                if (slugTryCount === 2) {
                    slugToFind += '-';
                } else {
                    // Otherwise, trim the number off the end
                    trimSpace = -(String(slugTryCount - 1).length);
                    slugToFind = slugToFind.slice(0, trimSpace);
                }

                slugToFind += slugTryCount;

                return checkIfSlugExists(slugToFind);
            });
        };

        slug = security.string.safe(base, options);

        // the slug may never be longer than the allowed limit of 191 chars, but should also
        // take the counter into count. We reduce a too long slug to 185 so we're always on the
        // safe side, also in terms of checking for existing slugs already.
        if (slug.length > 185) {
            // CASE: don't cut the slug on import
            if (!_.has(options, 'importing') || !options.importing) {
                slug = slug.slice(0, 185);
            }
        }

        // If it's a user, let's try to cut it down (unless this is a human request)
        if (baseName === 'user' && options && options.shortSlug && slugTryCount === 1 && slug !== 'ghost-owner') {
            longSlug = slug;
            slug = (slug.indexOf('-') > -1) ? slug.substr(0, slug.indexOf('-')) : slug;
        }

        if (!_.has(options, 'importing') || !options.importing) {
            // This checks if the first character of a tag name is a #. If it is, this
            // is an internal tag, and as such we should add 'hash' to the beginning of the slug
            if (baseName === 'tag' && /^#/.test(base)) {
                slug = 'hash-' + slug;
            }
        }

        // Some keywords cannot be changed
        slug = _.includes(urlUtils.getProtectedSlugs(), slug) ? slug + '-' + baseName : slug;

        // if slug is empty after trimming use the model name
        if (!slug) {
            slug = baseName;
        }

        // Test for duplicate slugs.
        return checkIfSlugExists(slug);
    }
});

// Export ghostBookshelf for use elsewhere
module.exports = ghostBookshelf;
